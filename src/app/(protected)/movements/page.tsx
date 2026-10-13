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
          <h1>Register movements</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          Registration is not available yet. Categories will come from the club
          spreadsheet.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={<p>Loading movements…</p>}>
      <MovementsPanel />
    </Suspense>
  );
}
