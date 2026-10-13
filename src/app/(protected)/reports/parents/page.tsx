import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAccess } from "@/lib/require-access";

async function ParentReportPanel() {
  const access = await requireAccess("parent-report");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Informe de familias</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {access.scope === "linked"
            ? "Este informe incluye solo a las jugadoras vinculadas a esta cuenta."
            : "Este informe incluye a todos los grupos."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ParentReportPage() {
  return (
    <Suspense fallback={<p>Cargando el informe de familias…</p>}>
      <ParentReportPanel />
    </Suspense>
  );
}
