import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAccess } from "@/lib/require-access";

async function DashboardPanel() {
  const access = await requireAccess("club-dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Panel</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {access.scope === "own"
            ? "Esta vista se limita a tu actividad."
            : "Las cifras del club llegan con el módulo de finanzas."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Cargando el panel…</p>}>
      <DashboardPanel />
    </Suspense>
  );
}
