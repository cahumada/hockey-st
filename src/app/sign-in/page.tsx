import { Suspense } from "react";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirectSignedInToDashboard } from "@/lib/require-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/dashboard" });
}

async function SignInScreen() {
  await redirectSignedInToDashboard();

  return (
    <main className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Ingresar</h1>
          </CardTitle>
          <CardDescription>
            Usá tu cuenta de Google para el hockey del Club Atlético San Telmo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGoogle}>
            <Button type="submit" className="min-h-11 w-full px-4">
              Ingresar con Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="w-full px-4 py-8">Cargando…</p>}>
      <SignInScreen />
    </Suspense>
  );
}
