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
          <h1>Club dashboard</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {access.scope === "own"
            ? "This view is limited to the collaborator's own activity."
            : "Club-wide figures arrive with the finance module."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard…</p>}>
      <DashboardPanel />
    </Suspense>
  );
}
