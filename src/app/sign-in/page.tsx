import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/account" });
}

export default function SignInPage() {
  return (
    <main className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Sign in</h1>
          </CardTitle>
          <CardDescription>
            Use your Google account for Club Atlético San Telmo hockey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGoogle}>
            <Button type="submit" className="min-h-11 w-full px-4">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
