import { prisma } from "@/lib/db";
import { readPrivateReceipt } from "@/lib/expense-receipt-store";
import { requireAccess } from "@/lib/require-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  await requireAccess("register-movements");

  const { expenseId } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { receiptPath: true, receiptContentType: true },
  });

  if (!expense?.receiptPath) {
    return new Response(null, { status: 404 });
  }

  const result = await readPrivateReceipt(expense.receiptPath);
  if (!result || result.statusCode !== 200) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": expense.receiptContentType ?? result.blob.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
