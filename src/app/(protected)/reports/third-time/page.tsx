import { Suspense } from "react";
import { io } from "next/cache";
import { ThirdTimeCategoryReport } from "@/components/third-time-category-report";
import { ThirdTimeReportCharts } from "@/components/third-time-report-charts";
import { ThirdTimeReportFilters } from "@/components/third-time-report-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { playerPortraitSrc } from "@/lib/player-portrait";
import { clubDate, formatCategoryLabel, formatRosterDate, sortCategories } from "@/lib/roster";
import { buildThirdTimeCategoryReport, parseThirdTimeReportQuery } from "@/lib/third-time-report";

async function ThirdTimeReportPanel({
  year,
  month,
  categoryCode,
}: {
  year: number;
  month: number;
  categoryCode: string | null;
}) {
  await requireAccess("register-movements");
  const [categories, feeDates, players, fees] = await Promise.all([
    prisma.category.findMany({ select: { code: true, description: true, thirdTimeAmount: true } }),
    prisma.thirdTimeFee.findMany({
      where: { deletedAt: null },
      distinct: ["chargedOn"],
      select: { chargedOn: true },
    }),
    categoryCode
      ? prisma.player.findMany({
          where: { categoryCode },
          select: {
            id: true,
            displayName: true,
            categoryCode: true,
            avatarPath: true,
            user: { select: { image: true } },
          },
        })
      : Promise.resolve([]),
    categoryCode
      ? prisma.thirdTimeFee.findMany({
          where: {
            deletedAt: null,
            categoryCode,
            chargedOn: {
              gte: new Date(`${year}-01-01T00:00:00.000Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
            },
          },
          select: { playerId: true, categoryCode: true, chargedOn: true, amount: true, status: true },
        })
      : Promise.resolve([]),
  ]);
  const sortedCategories = sortCategories(categories);
  const selected = sortedCategories.find((category) => category.code === categoryCode) ?? null;
  const clubYear = Number(clubDate(new Date()).slice(0, 4));
  const years = reportYears(
    feeDates.map((fee) => fee.chargedOn.getUTCFullYear()),
    year,
    clubYear,
  );
  const categoryItems = sortedCategories.map((category) => ({
    value: category.code,
    label: formatCategoryLabel(category),
  }));
  const yearItems = years.map((choice) => ({
    value: String(choice),
    label: String(choice),
  }));
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h1>Informe de 3er Tiempo</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <ThirdTimeReportFilters
          year={year}
          categoryCode={selected?.code ?? null}
          categories={categoryItems}
          years={yearItems}
        />
        {selected === null ? (
          <p>Elegí una categoría para ver el informe.</p>
        ) : players.length === 0 ? (
          <p>Esta categoría no tiene jugadoras.</p>
        ) : (
          <ReportView
            month={month}
            categoryLabel={formatCategoryLabel(selected)}
            categoryAmount={selected.thirdTimeAmount == null ? null : selected.thirdTimeAmount.toString()}
            playerCount={players.length}
            report={buildThirdTimeCategoryReport({
              year,
              categoryCode: selected.code,
              players: players.map((player) => ({
                id: player.id,
                displayName: player.displayName,
                categoryCode: player.categoryCode,
                portraitSrc: playerPortraitSrc({
                  id: player.id,
                  avatarPath: player.avatarPath,
                  googleImage: player.user?.image ?? null,
                }),
              })),
              fees: fees.map((fee) => ({
                playerId: fee.playerId,
                categoryCode: fee.categoryCode,
                chargedOn: formatRosterDate(fee.chargedOn),
                amount: fee.amount == null ? null : fee.amount.toString(),
                status: fee.status,
                deleted: false,
              })),
            })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ReportView({
  month,
  categoryLabel,
  categoryAmount,
  playerCount,
  report,
}: {
  month: number;
  categoryLabel: string;
  categoryAmount: string | null;
  playerCount: number;
  report: ReturnType<typeof buildThirdTimeCategoryReport>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ThirdTimeReportCharts
        initialMonth={month}
        playerCount={playerCount}
        categoryAmount={categoryAmount}
        report={report}
      />
      <ThirdTimeCategoryReport categoryLabel={categoryLabel} report={report} />
    </div>
  );
}

function reportYears(knownYears: readonly number[], selectedYear: number, clubYear: number): number[] {
  return [...new Set([selectedYear, clubYear, clubYear + 1, ...knownYears])].sort((left, right) => right - left);
}

export default async function ThirdTimeReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await io();
  const query = parseThirdTimeReportQuery(await searchParams);

  return (
    <Suspense fallback={<p>Cargando el informe de 3er Tiempo…</p>}>
      <ThirdTimeReportPanel year={query.year} month={query.month} categoryCode={query.categoryCode} />
    </Suspense>
  );
}
