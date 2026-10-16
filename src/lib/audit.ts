import { AsyncLocalStorage } from "node:async_hooks";

const auditUser = new AsyncLocalStorage<string>();

export function currentAuditUserId(): string | null {
  return auditUser.getStore() ?? null;
}

export function runWithAuditUser<T>(userId: string, action: () => Promise<T>): Promise<T> {
  return auditUser.run(userId, action);
}

export function stampWriteData(data: unknown, kind: "create" | "update"): unknown {
  const userId = currentAuditUserId();
  if (!userId) return data;
  if (Array.isArray(data)) {
    return data.map((row) => stampRecord(row, userId, kind));
  }
  return stampRecord(data, userId, kind);
}

function stampRecord(data: unknown, userId: string, kind: "create" | "update"): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return data;
  const record = data as Record<string, unknown>;
  if (kind === "create") {
    return {
      ...record,
      createdById: record.createdById ?? userId,
      updatedById: record.updatedById ?? userId,
    };
  }
  return {
    ...record,
    updatedById: record.updatedById ?? userId,
  };
}
