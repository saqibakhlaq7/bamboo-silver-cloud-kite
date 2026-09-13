import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoginPage } from "@/components/messenger/login-page";
import { VesperMark } from "@/components/messenger/mark";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <VesperMark className="size-12" />
          <h1 className="text-2xl font-semibold tracking-tight text-fg">LocalChat</h1>
          <p className="text-sm text-muted">Preparing sign-in…</p>
        </div>
      </main>
    );
  }
  if (user) return <Navigate to="/" />;
  return <LoginPage />;
}