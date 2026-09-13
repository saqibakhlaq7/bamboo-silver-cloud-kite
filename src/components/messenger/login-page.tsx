import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VesperMark } from "@/components/messenger/mark";
import { Separator } from "@/components/ui/separator";
import { handleEmail, loginIdentity } from "@/lib/messenger/handle";
import { claimProfile } from "@/lib/messenger/server";
import { USERNAME_RE } from "@/lib/messenger/types";

async function claimWhenReady(username: string, displayName: string): Promise<void> {
  let last: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      await claimProfile({
        data: { username, displayName, photoData: null },
      });
      return;
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("Could not claim username");
}

export function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const handle = username.trim().toLowerCase();
    if (mode === "up" && !USERNAME_RE.test(handle)) {
      setError("Username must start with a letter, 3–20 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        const display = name.trim() || handle;
        const { error: err } = await authClient.signUp.email({
          email: handleEmail(handle),
          password,
          name: display,
        });
        if (err) throw new Error(err.message || "Could not create account");
        try {
          await claimWhenReady(handle, display);
        } catch {
          /* onboarding will retry */
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email: loginIdentity(handle),
          password,
        });
        if (err) throw new Error(err.message || "Could not sign in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto grid min-h-dvh w-full max-w-5xl md:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-border px-10 py-12 md:flex">
          <VesperMark className="size-10" />
          <div className="stagger-in max-w-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Local-first</p>
            <h1 className="mt-4 font-display text-5xl font-medium leading-[1.1] tracking-tight text-fg">
              Messages that live on this device.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Sign in with a username. No email, no phone. History stays in this browser.
            </p>
          </div>
          <p className="text-xs text-faint">Voice and video. Alerts when you are away.</p>
        </section>

        <section className="flex items-center px-5 py-8 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 md:hidden">
              <VesperMark className="size-9" />
              <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">Vesper</h1>
              <p className="mt-1 text-sm text-muted">Username. Local history. Calls.</p>
            </div>

            <h2 className="font-display text-2xl font-medium tracking-tight">
              {mode === "in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "in"
                ? "Sign in with your username and password."
                : "Pick a username. That is how people find you — no email needed."}
            </p>

            <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-3">
              {mode === "up" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoComplete="username"
                  required
                  placeholder="yourname"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted">
              {mode === "in" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-medium text-fg underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setError(null);
                }}
              >
                {mode === "in" ? "Create an account" : "Sign in"}
              </button>
            </p>

            {GROK_PROVIDERS.length > 0 ? (
              <>
                <div className="my-5 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs uppercase tracking-wider text-faint">or</span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-2">
                  {GROK_PROVIDERS.map((p) => (
                    <Button
                      key={p.providerId}
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                    >
                      Continue with {p.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
