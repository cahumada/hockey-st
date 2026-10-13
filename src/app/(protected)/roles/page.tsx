import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAccess } from "@/lib/require-access";

async function RolesPanel() {
  await requireAccess("assign-roles");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Asignar roles</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          Un administrador asigna los roles acá. Las cuentas nuevas de Google quedan como visitantes hasta que se asignan.
        </p>
      </CardContent>
    </Card>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<p>Cargando roles…</p>}>
      <RolesPanel />
    </Suspense>
  );
}
