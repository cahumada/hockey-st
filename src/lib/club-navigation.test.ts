import assert from "node:assert/strict";
import { test } from "node:test";
import { navigationForRole, type NavigationItem } from "./club-navigation.ts";

const reportsGroup = {
  type: "group" as const,
  id: "reports",
  label: "Reportes",
  icon: "reports" as const,
  children: [{ href: "/reports/third-time", label: "3er Tiempo", icon: "third-time" as const }],
};

const maintenanceGroup = {
  type: "group" as const,
  id: "maintenance",
  label: "Mantenimiento",
  icon: "maintenance" as const,
  children: [
    {
      href: "/maintenance/expense-types",
      label: "Tipos de gasto",
      icon: "expense-types" as const,
    },
    {
      href: "/maintenance/income-types",
      label: "Tipos de ingreso",
      icon: "income-types" as const,
    },
    {
      href: "/maintenance/channels",
      label: "Tipos de canales",
      icon: "channels" as const,
    },
  ],
};

function link(href: string, label: string, icon: NavigationItem extends { icon: infer Icon } ? Icon : never) {
  return { type: "link" as const, href, label, icon };
}

test("administrator navigation keeps the flat links and inserts Mantenimiento after collaborators", () => {
  assert.deepEqual(navigationForRole("ADMINISTRATOR"), [
    link("/dashboard", "Panel", "dashboard"),
    link("/movements", "Gastos", "movements"),
    link("/third-time", "3er Tiempo", "third-time"),
    link("/roles", "Roles", "roles"),
    link("/players", "Jugadoras", "players"),
    link("/categories", "Categorías", "categories"),
    link("/collaborators", "Colaboradores", "collaborators"),
    maintenanceGroup,
    reportsGroup,
    link("/reports/club", "Informe del club", "club-report"),
    link("/reports/parents", "Informe de familias", "parent-report"),
  ]);
});

test("coordinator navigation includes Mantenimiento and keeps the other allowed links in order", () => {
  assert.deepEqual(navigationForRole("COORDINATOR"), [
    link("/dashboard", "Panel", "dashboard"),
    link("/movements", "Gastos", "movements"),
    link("/third-time", "3er Tiempo", "third-time"),
    link("/players", "Jugadoras", "players"),
    link("/categories", "Categorías", "categories"),
    link("/collaborators", "Colaboradores", "collaborators"),
    maintenanceGroup,
    reportsGroup,
    link("/reports/club", "Informe del club", "club-report"),
    link("/reports/parents", "Informe de familias", "parent-report"),
  ]);
});

test("collaborator navigation includes Reportes and excludes maintenance catalogs", () => {
  const navigation = navigationForRole("COLLABORATOR");
  const groups = navigation.filter((item) => item.type === "group");
  assert.deepEqual(groups, [reportsGroup]);
  const hrefs = navigation.flatMap((item) =>
    item.type === "link" ? [item.href] : item.children.map((child) => child.href),
  );
  assert.equal(hrefs.includes("/third-time"), true);
  assert.equal(hrefs.includes("/reports/third-time"), true);
  assert.equal(hrefs.includes("/maintenance/expense-types"), false);
  assert.equal(hrefs.includes("/maintenance/income-types"), false);
  assert.equal(hrefs.includes("/maintenance/channels"), false);
});

test("parent navigation includes the family report and excludes the third-time category report", () => {
  const hrefs = navigationForRole("PARENT").flatMap((item) =>
    item.type === "link" ? [item.href] : item.children.map((child) => child.href),
  );
  assert.equal(hrefs.includes("/reports/parents"), true);
  assert.equal(hrefs.includes("/reports/third-time"), false);
});
