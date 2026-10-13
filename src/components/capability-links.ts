import { accessFor, type Capability, type Role } from "@/lib/access";

export const capabilityLinks: {
  capability: Capability;
  href: string;
  label: string;
}[] = [
  { capability: "club-dashboard", href: "/dashboard", label: "Dashboard" },
  { capability: "register-movements", href: "/movements", label: "Movements" },
  { capability: "assign-roles", href: "/roles", label: "Roles" },
  { capability: "club-report", href: "/reports/club", label: "Club report" },
  { capability: "parent-report", href: "/reports/parents", label: "Parent report" },
];

export function linksForRole(role: Role) {
  return capabilityLinks.filter((link) => accessFor(role, link.capability).allowed);
}

export const roleLabels: Record<Role, string> = {
  ADMINISTRATOR: "Administrator",
  COORDINATOR: "Coordinator",
  COLLABORATOR: "Collaborator",
  PLAYER: "Player",
  PARENT: "Parent",
  VISITOR: "Visitor",
};
