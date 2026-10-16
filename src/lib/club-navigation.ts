import { accessFor, type Capability, type Role } from "./access.ts";

export type MenuIconName =
  | "dashboard"
  | "movements"
  | "third-time"
  | "roles"
  | "players"
  | "categories"
  | "collaborators"
  | "club-report"
  | "parent-report"
  | "maintenance"
  | "expense-types"
  | "income-types"
  | "channels";

type NavigationGroupMeta = {
  id: string;
  label: string;
  icon: MenuIconName;
};

export type CapabilityLink = {
  capability: Capability;
  href: string;
  label: string;
  icon: MenuIconName;
  group?: NavigationGroupMeta;
};

const maintenanceGroup: NavigationGroupMeta = {
  id: "maintenance",
  label: "Mantenimiento",
  icon: "maintenance",
};

export const capabilityLinks: CapabilityLink[] = [
  { capability: "club-dashboard", href: "/dashboard", label: "Panel", icon: "dashboard" },
  { capability: "register-movements", href: "/movements", label: "Gastos", icon: "movements" },
  { capability: "register-movements", href: "/third-time", label: "3er Tiempo", icon: "third-time" },
  { capability: "assign-roles", href: "/roles", label: "Roles", icon: "roles" },
  { capability: "manage-roster", href: "/players", label: "Jugadoras", icon: "players" },
  { capability: "view-categories", href: "/categories", label: "Categorías", icon: "categories" },
  {
    capability: "manage-collaborators",
    href: "/collaborators",
    label: "Colaboradores",
    icon: "collaborators",
  },
  {
    capability: "manage-maintenance",
    href: "/maintenance/expense-types",
    label: "Tipos de gasto",
    icon: "expense-types",
    group: maintenanceGroup,
  },
  {
    capability: "manage-maintenance",
    href: "/maintenance/income-types",
    label: "Tipos de ingreso",
    icon: "income-types",
    group: maintenanceGroup,
  },
  {
    capability: "manage-maintenance",
    href: "/maintenance/channels",
    label: "Tipos de canales",
    icon: "channels",
    group: maintenanceGroup,
  },
  { capability: "club-report", href: "/reports/club", label: "Informe del club", icon: "club-report" },
  {
    capability: "parent-report",
    href: "/reports/parents",
    label: "Informe de familias",
    icon: "parent-report",
  },
];

export type NavigationLeaf = {
  href: string;
  label: string;
  icon: MenuIconName;
};

export type NavigationLink = NavigationLeaf & {
  type: "link";
};

export type NavigationGroup = {
  type: "group";
  id: string;
  label: string;
  icon: MenuIconName;
  children: NavigationLeaf[];
};

export type NavigationItem = NavigationLink | NavigationGroup;

export function linksForRole(role: Role) {
  return capabilityLinks.filter((link) => accessFor(role, link.capability).allowed);
}

export function navigationForRole(role: Role): NavigationItem[] {
  const items: NavigationItem[] = [];

  for (const link of linksForRole(role)) {
    if (!link.group) {
      items.push({ type: "link", href: link.href, label: link.label, icon: link.icon });
      continue;
    }

    const previous = items.at(-1);
    if (previous?.type === "group" && previous.id === link.group.id) {
      previous.children.push({ href: link.href, label: link.label, icon: link.icon });
      continue;
    }

    items.push({
      type: "group",
      id: link.group.id,
      label: link.group.label,
      icon: link.group.icon,
      children: [{ href: link.href, label: link.label, icon: link.icon }],
    });
  }

  return items;
}
