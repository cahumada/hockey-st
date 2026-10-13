export function entryPathForUser(
  userId: string | null | undefined,
): "/dashboard" | null {
  if (typeof userId === "string" && userId.length > 0) {
    return "/dashboard";
  }

  return null;
}
