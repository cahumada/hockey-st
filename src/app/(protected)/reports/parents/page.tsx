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
          <h1>Parent report</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {access.scope === "linked"
            ? "This report includes only players linked to this account."
            : "This report includes every group."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ParentReportPage() {
  return (
    <Suspense fallback={<p>Loading parent report…</p>}>
      <ParentReportPanel />
    </Suspense>
  );
}
