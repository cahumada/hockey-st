import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAccess } from "@/lib/require-access";

async function ClubReportPanel() {
  await requireAccess("club-report");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Informe del club</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>El informe de gestión del club todavía no está disponible.</p>
      </CardContent>
    </Card>
  );
}

export default function ClubReportPage() {
  return (
    <Suspense fallback={<p>Cargando el informe del club…</p>}>
      <ClubReportPanel />
    </Suspense>
  );
}
