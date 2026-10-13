import { Suspense } from "react";
import Link from "next/link";
import {
  linksForRole,
  roleLabels,
} from "@/components/capability-links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/require-access";

async function AccountPanel() {
  const { role } = await requireSession();
  const links = linksForRole(role);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Account</h1>
        </CardTitle>
        <CardDescription>Your role is {roleLabels[role]}.</CardDescription>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p>No additional tools are available for this role.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p>Loading account…</p>}>
      <AccountPanel />
    </Suspense>
  );
}
