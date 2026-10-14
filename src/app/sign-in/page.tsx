import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import { signIn } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { redirectSignedInToDashboard } from "@/lib/require-access";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/dashboard" });
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function SignInBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[oklch(0.688_0.141_232.6)] to-primary" />
      <div className="absolute -left-24 top-8 size-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30" />
      <div className="absolute -right-16 bottom-12 size-80 rounded-full bg-[oklch(0.688_0.141_232.6)]/25 blur-3xl dark:bg-[oklch(0.688_0.141_232.6)]/15" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_55%)] opacity-60 dark:opacity-40" />
    </div>
  );
}

function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col bg-background">
      <SignInBackdrop />
      <header className="flex items-center justify-end px-4 py-3 sm:px-6">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6 sm:pb-16">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/85 p-6 shadow-lg shadow-primary/10 backdrop-blur-md sm:p-8">
          {children}
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">
        Portal del club · acceso con Google
      </p>
    </main>
  );
}

async function SignInScreen() {
  await redirectSignedInToDashboard();

  return (
    <SignInLayout>
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-110 rounded-full bg-[radial-gradient(circle,var(--accent)_0%,transparent_72%)]"
          />
          <Image
            src="/brand/san-telmo-crest.png"
            alt="Escudo de las Candomberas de San Telmo"
            width={534}
            height={640}
            priority
            sizes="(min-width: 640px) 192px, 160px"
            className="relative h-auto w-40 drop-shadow-md sm:w-48"
          />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.688_0.141_232.6)]">
          Hockey
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
          Club Atlético San Telmo
        </h1>
        <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          Usá tu cuenta de Google. Las cuentas nuevas quedan como visitantes hasta que un administrador asigna un rol.
        </p>
        <form action={signInWithGoogle} className="mt-7 w-full">
          <Button type="submit" className="min-h-11 w-full gap-2.5 px-4 text-base shadow-sm">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-white">
              <GoogleMark />
            </span>
            Ingresar con Google
          </Button>
        </form>
      </div>
    </SignInLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <SignInLayout>
          <p className="text-center text-sm text-muted-foreground">Cargando el ingreso…</p>
        </SignInLayout>
      }
    >
      <SignInScreen />
    </Suspense>
  );
}
