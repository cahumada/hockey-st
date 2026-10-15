import type { Role } from "../generated/prisma/enums.ts";

export type { Role };

export type Capability =
  | "club-dashboard"
  | "register-movements"
  | "assign-roles"
  | "club-report"
  | "parent-report"
  | "manage-roster"
  | "manage-collaborators"
  | "view-categories";

export type AccessScope = "all" | "own" | "linked";

export type AccessDecision =
  | { allowed: true; scope: AccessScope }
  | { allowed: false };

const denied = { allowed: false } as const satisfies AccessDecision;

function allow(scope: AccessScope): AccessDecision {
  return { allowed: true, scope };
}

export function accessFor(role: Role, capability: Capability): AccessDecision {
  if (role === "ADMINISTRATOR") {
    return allow("all");
  }

  if (role === "COORDINATOR") {
    if (capability === "assign-roles") {
      return denied;
    }
    return allow("all");
  }

  if (role === "COLLABORATOR") {
    if (capability === "club-dashboard") {
      return allow("own");
    }
    if (capability === "register-movements") {
      return allow("all");
    }
    return denied;
  }

  if (role === "PARENT" && capability === "parent-report") {
    return allow("linked");
  }

  if (capability === "club-dashboard") return allow("own");

  return denied;
}
