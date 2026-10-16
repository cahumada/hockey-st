import { prisma } from "@/lib/db";
import { readPrivateReceipt } from "@/lib/expense-receipt-store";
import { requireAccess } from "@/lib/require-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feeId: string }> },
) {
  await requireAccess("register-movements");

  const { feeId } = await params;
  const fee = await prisma.thirdTimeFee.findFirst({
    where: { id: feeId, deletedAt: null },
    select: { receiptPath: true, receiptContentType: true },
  });

  if (!fee?.receiptPath) {
    return new Response(null, { status: 404 });
  }

  const result = await readPrivateReceipt(fee.receiptPath);
  if (!result || result.statusCode !== 200) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": fee.receiptContentType ?? result.blob.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
