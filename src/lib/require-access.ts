import { io } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  accessFor,
  type AccessScope,
  type Capability,
  type Role,
} from "@/lib/access";

export async function requireSession(): Promise<{ userId: string; role: Role }> {
  // Auth draws a nonce during prerender. Suspend so the session check runs per request.
  await io();
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || !role) {
    redirect("/sign-in");
  }

  return { userId, role };
}

export async function requireAccess(capability: Capability): Promise<{
  userId: string;
  role: Role;
  scope: AccessScope;
}> {
  const session = await requireSession();
  const decision = accessFor(session.role, capability);

  if (!decision.allowed) {
    notFound();
  }

  return {
    userId: session.userId,
    role: session.role,
    scope: decision.scope,
  };
}
