import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { redirectSignedInToDashboard } from "@/lib/require-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  await redirectSignedInToDashboard();

  return (
    <main className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Club Atlético San Telmo hockey</h1>
          </CardTitle>
          <CardDescription>
            Ingresá con Google para abrir tu cuenta. Las cuentas nuevas quedan como visitantes hasta que un administrador asigna un rol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sign-in"
            className={cn(buttonVariants(), "min-h-11 px-4")}
          >
            Ingresar
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
