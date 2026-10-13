import { accessFor, type Capability, type Role } from "@/lib/access";

export const capabilityLinks: {
  capability: Capability;
  href: string;
  label: string;
}[] = [
  { capability: "club-dashboard", href: "/dashboard", label: "Panel" },
  { capability: "register-movements", href: "/movements", label: "Movimientos" },
  { capability: "assign-roles", href: "/roles", label: "Roles" },
  { capability: "manage-roster", href: "/players", label: "Jugadoras" },
  { capability: "club-report", href: "/reports/club", label: "Informe del club" },
  { capability: "parent-report", href: "/reports/parents", label: "Informe de familias" },
];

export function linksForRole(role: Role) {
  return capabilityLinks.filter((link) => accessFor(role, link.capability).allowed);
}

export const roleLabels: Record<Role, string> = {
  ADMINISTRATOR: "Administrador",
  COORDINATOR: "Coordinador",
  COLLABORATOR: "Colaborador",
  PLAYER: "Jugadora",
  PARENT: "Familia",
  VISITOR: "Visitante",
};
