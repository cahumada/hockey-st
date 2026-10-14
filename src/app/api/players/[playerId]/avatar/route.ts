import { prisma } from "@/lib/db";
import { readPrivateAvatar } from "@/lib/player-avatar-store";
import { requireAccess } from "@/lib/require-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  await requireAccess("manage-roster");

  const { playerId } = await params;
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { avatarPath: true },
  });

  if (!player?.avatarPath) {
    return new Response(null, { status: 404 });
  }

  const result = await readPrivateAvatar(player.avatarPath);
  if (!result || result.statusCode !== 200) {
    return new Response(null, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
