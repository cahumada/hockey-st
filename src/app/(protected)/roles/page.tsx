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
          <h1>Assign roles</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          An administrator assigns roles here. New Google accounts stay visitors
          until assigned.
        </p>
      </CardContent>
    </Card>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<p>Loading roles…</p>}>
      <RolesPanel />
    </Suspense>
  );
}
