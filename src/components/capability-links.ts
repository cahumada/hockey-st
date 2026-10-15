import type { Role } from "@/lib/access";

export {
  capabilityLinks,
  linksForRole,
  navigationForRole,
  type CapabilityLink,
  type MenuIconName,
  type NavigationGroup,
  type NavigationItem,
  type NavigationLeaf,
  type NavigationLink,
} from "@/lib/club-navigation";

export const roleLabels: Record<Role, string> = {
  ADMINISTRATOR: "Administrador",
  COORDINATOR: "Coordinador",
  COLLABORATOR: "Colaborador",
  PLAYER: "Jugadora",
  PARENT: "Familia",
  VISITOR: "Visitante",
};
