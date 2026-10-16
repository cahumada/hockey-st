import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { stampWriteData } from "@/lib/audit";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const clientStamp = "audit-v1";

function createPrisma() {
  const base = new PrismaClient({ adapter });
  return base.$extends({
    query: {
      $allModels: {
        create({ args, query }) {
          args.data = stampWriteData(args.data, "create") as typeof args.data;
          return query(args);
        },
        createMany({ args, query }) {
          args.data = stampWriteData(args.data, "create") as typeof args.data;
          return query(args);
        },
        update({ args, query }) {
          args.data = stampWriteData(args.data, "update") as typeof args.data;
          return query(args);
        },
        updateMany({ args, query }) {
          args.data = stampWriteData(args.data, "update") as typeof args.data;
          return query(args);
        },
        upsert({ args, query }) {
          args.create = stampWriteData(args.create, "create") as typeof args.create;
          args.update = stampWriteData(args.update, "update") as typeof args.update;
          return query(args);
        },
      },
    },
  });
}

type AppPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrisma;
  prismaStamp?: string;
};

const previous = globalForPrisma.prisma;
const prisma =
  globalForPrisma.prismaStamp === clientStamp && previous ? previous : createPrisma();

export { prisma };

if (process.env.NODE_ENV !== "production") {
  if (previous && previous !== prisma) {
    void previous.$disconnect().catch(() => undefined);
  }
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaStamp = clientStamp;
}
