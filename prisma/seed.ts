import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { legacyCollaborators } from "../src/lib/legacy-collaborators.ts";
import { splitCollaboratorName } from "../src/lib/collaborators.ts";
import {
  legacyExpenseTypes,
  legacyIncomeTypes,
} from "../src/lib/legacy-maintenance-catalogs.ts";
import { legacyCategories, legacyPlayers } from "../src/lib/legacy-roster.ts";
import { isRosterInactiveReason } from "../src/lib/roster.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the player roster");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function rosterDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

async function main() {
  for (const category of legacyCategories) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: {
        description: category.description,
        active: category.active,
      },
      create: category,
    });
  }

  for (const player of legacyPlayers) {
    const statusReason =
      player.statusReason && isRosterInactiveReason(player.statusReason)
        ? player.statusReason
        : null;

    await prisma.player.upsert({
      where: { legacyId: player.legacyId },
      update: {},
      create: {
        legacyId: player.legacyId,
        displayName: player.displayName,
        categoryCode: player.categoryCode,
        rosterStatus: player.rosterStatus,
        statusReason,
        statusChangedOn: player.statusChangedOn ? rosterDate(player.statusChangedOn) : null,
      },
    });
  }

  for (const collaborator of legacyCollaborators) {
    await prisma.collaborator.upsert({
      where: { legacyId: collaborator.legacyId },
      update: {},
      create: {
        legacyId: collaborator.legacyId,
        displayName: collaborator.displayName,
        ...splitCollaboratorName(collaborator.displayName),
        kind: collaborator.kind,
        categoryCode: collaborator.categoryCode,
        status: collaborator.status,
        statusChangedOn: collaborator.statusChangedOn
          ? rosterDate(collaborator.statusChangedOn)
          : null,
      },
    });
  }

  for (const expenseType of legacyExpenseTypes) {
    await prisma.expenseType.upsert({
      where: { legacyId: expenseType.legacyId },
      update: {},
      create: {
        legacyId: expenseType.legacyId,
        description: expenseType.description,
        status: expenseType.status,
      },
    });
  }

  for (const incomeType of legacyIncomeTypes) {
    await prisma.incomeType.upsert({
      where: { legacyId: incomeType.legacyId },
      update: {},
      create: {
        legacyId: incomeType.legacyId,
        description: incomeType.description,
        status: incomeType.status,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
