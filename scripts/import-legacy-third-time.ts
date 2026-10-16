import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { resolveLegacyThirdTime } from "../src/lib/legacy-third-time-import.ts";
import { legacyPlayers } from "../src/lib/legacy-roster.ts";
import {
  parseLegacyThirdTimeRow,
  type LegacyThirdTimeCells,
} from "../src/lib/legacy-third-time.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const workbookPath = path.resolve("docs/legacy/2026-Hockey San Telmo.xlsx");
const dryRun = process.argv.includes("--dry-run");
const maxLegacyReceiptBytes = 15 * 1024 * 1024;
const sheetCopy = path.join(tmpdir(), "hockey-2026-third-time.xlsx");
copyFileSync(workbookPath, sheetCopy);

const extracted = spawnSync("python", ["scripts/read_third_time_sheet.py", sheetCopy], {
  encoding: "utf8",
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
});
if (extracted.status !== 0) {
  console.error(extracted.stderr || extracted.stdout);
  process.exit(extracted.status ?? 1);
}

const sheetRows = JSON.parse(extracted.stdout) as LegacyThirdTimeCells[];
const [players, collaborators] = await Promise.all([
  prisma.player.findMany({
    select: { id: true, legacyId: true, displayName: true, categoryCode: true },
  }),
  prisma.collaborator.findMany({ select: { id: true, displayName: true } }),
]);

const unresolved: string[] = [];
const ready = [];
for (const cells of sheetRows) {
  const parsed = parseLegacyThirdTimeRow(cells);
  const resolved = resolveLegacyThirdTime(parsed, players, collaborators, legacyPlayers);
  if (!resolved.ok) {
    unresolved.push(`Fila ${parsed.legacyRow}: ${resolved.reason}`);
    continue;
  }
  ready.push({ parsed, resolved });
}

if (unresolved.length > 0) {
  console.error(unresolved.join("\n"));
  await prisma.$disconnect();
  process.exit(1);
}

console.log(
  JSON.stringify({
    rows: ready.length,
    receipts: ready.filter((row) => row.parsed.driveFileId).length,
    dryRun,
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
  }),
);

if (dryRun) {
  await prisma.$disconnect();
  process.exit(0);
}

let receiptsCopied = 0;
let receiptsReused = 0;
const receiptFailures: string[] = [];

for (const row of ready) {
  const saved = await prisma.thirdTimeFee.upsert({
    where: { legacyRow: row.parsed.legacyRow },
    create: feeData(row.parsed, row.resolved),
    update: feeData(row.parsed, row.resolved),
    select: { id: true, receiptPath: true, legacyDriveFileId: true },
  });

  const driveFileId = row.parsed.driveFileId;
  if (!driveFileId || saved.receiptPath) continue;

  const shared = await prisma.thirdTimeFee.findFirst({
    where: { legacyDriveFileId: driveFileId, receiptPath: { not: null } },
    select: { receiptPath: true, receiptContentType: true },
  });
  if (shared?.receiptPath) {
    await prisma.thirdTimeFee.update({
      where: { id: saved.id },
      data: {
        receiptPath: shared.receiptPath,
        receiptContentType: shared.receiptContentType,
      },
    });
    receiptsReused += 1;
    continue;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    receiptFailures.push(`Fila ${row.parsed.legacyRow}: falta BLOB_READ_WRITE_TOKEN`);
    continue;
  }

  try {
    const downloaded = await downloadDriveFile(driveFileId);
    if (!downloaded.ok) {
      receiptFailures.push(`Fila ${row.parsed.legacyRow}: ${downloaded.reason}`);
      continue;
    }

    const blob = await put(
      `third-time/${saved.id}/receipt.${downloaded.extension}`,
      downloaded.bytes,
      {
        access: "private",
        addRandomSuffix: true,
        contentType: downloaded.contentType,
      },
    );
    await prisma.thirdTimeFee.update({
      where: { id: saved.id },
      data: { receiptPath: blob.pathname, receiptContentType: downloaded.contentType },
    });
    receiptsCopied += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "error de red";
    receiptFailures.push(`Fila ${row.parsed.legacyRow}: ${message}`);
  }
}

console.log(JSON.stringify({ receiptsCopied, receiptsReused, receiptFailures }));
await prisma.$disconnect();
if (receiptFailures.length > 0) process.exit(1);

function feeData(
  parsed: ReturnType<typeof parseLegacyThirdTimeRow>,
  resolved: { playerId: string; controllerId: string },
) {
  return {
    legacyRow: parsed.legacyRow,
    playerId: resolved.playerId,
    categoryCode: parsed.categoryCode,
    amount: parsed.amount,
    chargedOn: new Date(`${parsed.chargedOn}T00:00:00.000Z`),
    paidOn: parsed.paidOn ? new Date(`${parsed.paidOn}T00:00:00.000Z`) : null,
    receiptReference: parsed.receiptReference,
    channel: parsed.channel,
    status: parsed.status,
    controllerId: resolved.controllerId,
    notes: parsed.notes,
    legacyDriveFileId: parsed.driveFileId,
  };
}

async function downloadDriveFile(
  fileId: string,
): Promise<
  | { ok: true; bytes: Buffer; contentType: string; extension: string }
  | { ok: false; reason: string }
> {
  const response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!response.ok || contentType.startsWith("text/html")) {
    return { ok: false, reason: `Drive respondió ${response.status} ${contentType}` };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxLegacyReceiptBytes) {
    return { ok: false, reason: "el archivo supera 15 MB" };
  }
  return {
    ok: true,
    bytes,
    contentType: contentType || "application/octet-stream",
    extension: extensionFor(contentType),
  };
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return "jpg";
}
