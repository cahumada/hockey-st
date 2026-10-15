import { accessFor, type Capability, type Role } from "@/lib/access";

export type MenuIconName =
  | "dashboard"
  | "movements"
  | "roles"
  | "players"
  | "categories"
  | "collaborators"
  | "club-report"
  | "parent-report";

export const capabilityLinks: {
  capability: Capability;
  href: string;
  label: string;
  icon: MenuIconName;
}[] = [
  { capability: "club-dashboard", href: "/dashboard", label: "Panel", icon: "dashboard" },
  { capability: "register-movements", href: "/movements", label: "Movimientos", icon: "movements" },
  { capability: "assign-roles", href: "/roles", label: "Roles", icon: "roles" },
  { capability: "manage-roster", href: "/players", label: "Jugadoras", icon: "players" },
  { capability: "view-categories", href: "/categories", label: "Categorías", icon: "categories" },
  {
    capability: "manage-collaborators",
    href: "/collaborators",
    label: "Colaboradores",
    icon: "collaborators",
  },
  { capability: "club-report", href: "/reports/club", label: "Informe del club", icon: "club-report" },
  {
    capability: "parent-report",
    href: "/reports/parents",
    label: "Informe de familias",
    icon: "parent-report",
  },
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
