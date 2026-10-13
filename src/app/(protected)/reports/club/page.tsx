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
          <h1>Club report</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>The club management report is not available yet.</p>
      </CardContent>
    </Card>
  );
}

export default function ClubReportPage() {
  return (
    <Suspense fallback={<p>Loading club report…</p>}>
      <ClubReportPanel />
    </Suspense>
  );
}
