import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAccess } from "@/lib/require-access";

async function MovementsPanel() {
  await requireAccess("register-movements");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Registrar movimientos</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          El registro todavía no está disponible. Las categorías van a salir de la planilla del club.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={<p>Cargando movimientos…</p>}>
      <MovementsPanel />
    </Suspense>
  );
}
