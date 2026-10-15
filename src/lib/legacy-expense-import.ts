import type { ParsedLegacyExpense } from "./legacy-expenses.ts";

export type LegacyExpenseTypeRef = {
  id: string;
  description: string;
};

export type LegacyExpenseCollaboratorRef = {
  id: string;
  displayName: string;
  categoryCode: string | null;
};

export function resolveLegacyExpense(
  expense: ParsedLegacyExpense,
  expenseTypes: readonly LegacyExpenseTypeRef[],
  collaborators: readonly LegacyExpenseCollaboratorRef[],
):
  | { ok: true; expenseTypeId: string; collaboratorId: string }
  | { ok: false; reason: string } {
  const expenseType = expenseTypes.find(
    (candidate) => candidate.description === expense.expenseTypeDescription,
  );
  if (!expenseType) {
    return { ok: false, reason: `Tipo desconocido: ${expense.expenseTypeDescription}` };
  }

  const collaborator = collaborators.find(
    (candidate) =>
      candidate.displayName === expense.collaborator.displayName &&
      candidate.categoryCode === expense.collaborator.categoryCode,
  );
  if (!collaborator) {
    return {
      ok: false,
      reason: `Colaborador desconocido: ${expense.collaborator.displayName}`,
    };
  }

  return { ok: true, expenseTypeId: expenseType.id, collaboratorId: collaborator.id };
}
