import { Suspense } from "react";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  ThirdTimeBoard,
  type ThirdTimeCategoryChoice,
  type ThirdTimeCollaboratorChoice,
  type ThirdTimePlayerChoice,
  type ThirdTimeRow,
} from "@/components/third-time-board";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { thirdTimeCollaboratorKinds } from "@/lib/collaborators";
import { playerPortraitSrc } from "@/lib/player-portrait";
import { formatCategoryLabel, sortCategories } from "@/lib/roster";
import {
  defaultThirdTimePeriod,
  feeStatusesFromFilter,
  parseThirdTimeListQuery,
  sumThirdTimeAmounts,
  thirdTimeChargedOnBounds,
  thirdTimeListSearchParams,
  thirdTimeOverview,
  thirdTimePageCount,
  thirdTimePageSize,
  type ThirdTimeListParams,
  type ThirdTimeListQuery,
} from "@/lib/third-time";
import {
  createCategoryThirdTimeFees,
  createThirdTimeFee,
  deleteThirdTimeFee,
  updateThirdTimeFee,
} from "./actions";
import { ThirdTimeFallback } from "./third-time-fallback";

async function ThirdTimePanel({ query }: { query: ThirdTimeListQuery }) {
  await requireAccess("register-movements");
  const [players, categories, collaborators, ledger, channelRows, catalogChannels] = await Promise.all([
    prisma.player.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        categoryCode: true,
        rosterStatus: true,
        avatarPath: true,
        user: { select: { image: true } },
      },
    }),
    prisma.category.findMany({
      select: { code: true, description: true, active: true, thirdTimeAmount: true },
    }),
    prisma.collaborator.findMany({
      where: { kind: { in: [...thirdTimeCollaboratorKinds] } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, categoryCode: true, kind: true, status: true },
    }),
    prisma.thirdTimeFee.findMany({
      where: { deletedAt: null },
      select: { chargedOn: true, amount: true },
    }),
    prisma.thirdTimeFee.findMany({
      where: { deletedAt: null, channel: { not: null } },
      distinct: ["channel"],
      select: { channel: true },
    }),
    prisma.thirdTimeChannel.findMany({
      orderBy: { description: "asc" },
      select: { description: true, status: true },
    }),
  ]);
  const knownYears = chargedOnYears(ledger.map((row) => row.chargedOn));
  const defaultPeriod = defaultThirdTimePeriod();
  const overview = thirdTimeOverview(
    ledger.map((row) => ({
      chargedOn: isoDate(row.chargedOn),
      amount: decimalToString(row.amount),
    })),
  );
  const where = feeWhere(query, knownYears);
  const [matchCount, amountRows, fees] = await Promise.all([
    prisma.thirdTimeFee.count({ where }),
    prisma.thirdTimeFee.findMany({
      where,
      select: { amount: true },
    }),
    prisma.thirdTimeFee.findMany({
      where,
      orderBy: [{ chargedOn: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * thirdTimePageSize,
      take: thirdTimePageSize,
      include: {
        player: {
          select: { displayName: true, avatarPath: true, user: { select: { image: true } } },
        },
        category: { select: { code: true, description: true } },
        controller: { select: { displayName: true, categoryCode: true } },
      },
    }),
  ]);
  const pageCount = thirdTimePageCount(matchCount);
  if (query.page > pageCount) {
    redirect(`/third-time?${thirdTimeListSearchParams({ ...query, page: pageCount })}`);
  }

  const rows: ThirdTimeRow[] = fees.map((fee) => ({
    id: fee.id,
    playerId: fee.playerId,
    playerName: fee.player.displayName,
    portraitSrc: playerPortraitSrc({
      id: fee.playerId,
      avatarPath: fee.player.avatarPath,
      googleImage: fee.player.user?.image ?? null,
    }),
    categoryCode: fee.categoryCode,
    categoryLabel: formatCategoryLabel(fee.category),
    chargedOn: isoDate(fee.chargedOn),
    paidOn: fee.paidOn ? isoDate(fee.paidOn) : null,
    amount: decimalToString(fee.amount),
    channel: fee.channel,
    status: fee.status,
    controllerId: fee.controllerId,
    controllerName: fee.controller.displayName,
    receiptReference: fee.receiptReference,
    notes: fee.notes,
    hasReceipt: Boolean(fee.receiptPath),
    receiptContentType: fee.receiptContentType,
  }));

  return (
    <ThirdTimeBoard
      query={query}
      defaultPeriod={defaultPeriod}
      rows={rows}
      matchCount={matchCount}
      pageCount={pageCount}
      totalAmount={sumThirdTimeAmounts(amountRows.map((row) => ({ amount: decimalToString(row.amount) })))}
      hasAny={ledger.length > 0}
      overview={overview}
      years={yearChoices(knownYears, query.years, defaultPeriod.year)}
      categories={categoryChoices(categories)}
      channels={channelChoices(
        [...catalogChannels.map((channel) => channel.description), ...channelRows.map((row) => row.channel)],
        query.channels,
      )}
      channelOptions={catalogChannels.map((channel) => ({
        id: channel.description,
        label: channel.description,
        active: channel.status === "ACTIVE",
      }))}
      players={players.map(playerChoice)}
      collaborators={collaborators.map(collaboratorChoice)}
      receiptStorageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())}
      createAction={createThirdTimeFee}
      createCategoryAction={createCategoryThirdTimeFees}
      updateAction={updateThirdTimeFee}
      deleteAction={deleteThirdTimeFee}
    />
  );
}

function feeWhere(query: ThirdTimeListQuery, knownYears: readonly number[]): Prisma.ThirdTimeFeeWhereInput {
  const filters: Prisma.ThirdTimeFeeWhereInput[] = [];
  const bounds = thirdTimeChargedOnBounds(query, knownYears);
  if (bounds) {
    filters.push({
      OR: bounds.map((bound) => ({
        chargedOn: { gte: utcDate(bound.gte), lt: utcDate(bound.lt) },
      })),
    });
  }
  const statuses = feeStatusesFromFilter(query.statuses);
  if (statuses.length > 0) filters.push({ status: { in: statuses } });
  if (query.categoryCodes.length > 0) filters.push({ categoryCode: { in: [...query.categoryCodes] } });
  if (query.channels.length > 0) filters.push({ channel: { in: [...query.channels] } });
  if (query.controllerIds.length > 0) filters.push({ controllerId: { in: [...query.controllerIds] } });
  if (query.text) {
    filters.push({
      OR: [
        { notes: { contains: query.text, mode: "insensitive" } },
        { channel: { contains: query.text, mode: "insensitive" } },
        { receiptReference: { contains: query.text, mode: "insensitive" } },
        { player: { displayName: { contains: query.text, mode: "insensitive" } } },
        { controller: { displayName: { contains: query.text, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: [{ deletedAt: null }, ...filters] };
}

function chargedOnYears(dates: readonly Date[]): number[] {
  return [...new Set(dates.map((date) => date.getUTCFullYear()))];
}

function yearChoices(knownYears: readonly number[], selected: readonly number[], currentYear: number): number[] {
  const years = new Set(knownYears);
  years.add(currentYear);
  for (const year of selected) years.add(year);
  return [...years].sort((left, right) => right - left);
}

function channelChoices(stored: readonly (string | null)[], selected: readonly string[]): string[] {
  const channels = new Set(stored.filter((channel): channel is string => Boolean(channel)));
  for (const channel of selected) channels.add(channel);
  return [...channels].sort((left, right) => left.localeCompare(right, "es"));
}

function categoryChoices(
  categories: readonly {
    code: string;
    description: string;
    active: boolean;
    thirdTimeAmount: { toString(): string } | null;
  }[],
): ThirdTimeCategoryChoice[] {
  return sortCategories([...categories]).map((category) => ({
    code: category.code,
    label: formatCategoryLabel(category),
    active: category.active,
    thirdTimeAmount: category.thirdTimeAmount ? category.thirdTimeAmount.toString() : null,
  }));
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function decimalToString(amount: { toString(): string } | null): string | null {
  return amount ? amount.toString() : null;
}

function playerChoice(player: {
  id: string;
  displayName: string;
  categoryCode: string;
  rosterStatus: "ACTIVE" | "INACTIVE";
  avatarPath: string | null;
  user: { image: string | null } | null;
}): ThirdTimePlayerChoice {
  return {
    id: player.id,
    label: player.displayName,
    categoryCode: player.categoryCode,
    active: player.rosterStatus === "ACTIVE",
    portraitSrc: playerPortraitSrc({
      id: player.id,
      avatarPath: player.avatarPath,
      googleImage: player.user?.image ?? null,
    }),
  };
}

function collaboratorChoice(collaborator: {
  id: string;
  displayName: string;
  categoryCode: string | null;
  kind: string;
  status: "ACTIVE" | "INACTIVE";
}): ThirdTimeCollaboratorChoice {
  return {
    id: collaborator.id,
    label: collaboratorLabel(collaborator.displayName, collaborator.categoryCode),
    categoryCode: collaborator.categoryCode,
    kind: collaborator.kind,
    active: collaborator.status === "ACTIVE",
  };
}

function collaboratorLabel(displayName: string, categoryCode: string | null): string {
  return categoryCode ? `${categoryCode} · ${displayName}` : displayName;
}

export default async function ThirdTimePage({
  searchParams,
}: {
  searchParams: Promise<ThirdTimeListParams>;
}) {
  await io();
  const parsed = parseThirdTimeListQuery(await searchParams);
  if (!parsed.explicitPeriod) {
    redirect(`/third-time?${thirdTimeListSearchParams(parsed.query)}`);
  }

  return (
    <Suspense fallback={<ThirdTimeFallback />}>
      <ThirdTimePanel query={parsed.query} />
    </Suspense>
  );
}
