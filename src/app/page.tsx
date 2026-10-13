import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Club Atlético San Telmo hockey</h1>
          </CardTitle>
          <CardDescription>
            Sign in with Google to open your account. New accounts stay visitors
            until an administrator assigns a role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sign-in"
            className={cn(buttonVariants(), "min-h-11 px-4")}
          >
            Sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
