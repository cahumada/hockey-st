import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { resolveLegacyExpense } from "../src/lib/legacy-expense-import.ts";
import {
  parseLegacyExpenseRow,
  type LegacyExpenseCells,
} from "../src/lib/legacy-expenses.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const workbookPath = path.resolve("docs/legacy/2026-Hockey San Telmo.xlsx");
const dryRun = process.argv.includes("--dry-run");
const maxLegacyReceiptBytes = 15 * 1024 * 1024;

const extracted = spawnSync("python", ["scripts/read_gastos_sheet.py", workbookPath], {
  encoding: "utf8",
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
});
if (extracted.status !== 0) {
  console.error(extracted.stderr || extracted.stdout);
  process.exit(extracted.status ?? 1);
}

const sheetRows = JSON.parse(extracted.stdout) as LegacyExpenseCells[];
const [expenseTypes, collaborators] = await Promise.all([
  prisma.expenseType.findMany({ select: { id: true, description: true } }),
  prisma.collaborator.findMany({
    select: { id: true, displayName: true, categoryCode: true },
  }),
]);

const unresolved: string[] = [];
const ready = [];
for (const cells of sheetRows) {
  const parsed = parseLegacyExpenseRow(cells);
  const resolved = resolveLegacyExpense(parsed, expenseTypes, collaborators);
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
  const saved = await prisma.expense.upsert({
    where: { legacyRow: row.parsed.legacyRow },
    create: expenseData(row.parsed, row.resolved),
    update: expenseData(row.parsed, row.resolved),
    select: { id: true, receiptPath: true, legacyDriveFileId: true },
  });

  const driveFileId = row.parsed.driveFileId;
  if (!driveFileId || saved.receiptPath) continue;

  const shared = await prisma.expense.findFirst({
    where: { legacyDriveFileId: driveFileId, receiptPath: { not: null } },
    select: { receiptPath: true, receiptContentType: true },
  });
  if (shared?.receiptPath) {
    await prisma.expense.update({
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

  console.log(JSON.stringify({ legacyRow: row.parsed.legacyRow, step: "copy" }));

  try {
    const downloaded = await downloadDriveFile(driveFileId);
    if (!downloaded.ok) {
      receiptFailures.push(`Fila ${row.parsed.legacyRow}: ${downloaded.reason}`);
      continue;
    }

    const blob = await put(
      `expenses/${saved.id}/receipt.${downloaded.extension}`,
      downloaded.bytes,
      {
        access: "private",
        addRandomSuffix: true,
        contentType: downloaded.contentType,
      },
    );
    await prisma.expense.update({
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

function expenseData(
  parsed: ReturnType<typeof parseLegacyExpenseRow>,
  resolved: { expenseTypeId: string; collaboratorId: string },
) {
  return {
    legacyRow: parsed.legacyRow,
    spentOn: new Date(`${parsed.spentOn}T00:00:00.000Z`),
    expenseTypeId: resolved.expenseTypeId,
    unitAmount: parsed.unitAmount,
    quantity: parsed.quantity,
    collaboratorId: resolved.collaboratorId,
    notes: parsed.notes,
    verified: parsed.verified,
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
  return { ok: true, bytes, contentType: contentType || "application/octet-stream", extension: extensionFor(contentType) };
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "application/pdf") return "pdf";
  return "jpg";
}
