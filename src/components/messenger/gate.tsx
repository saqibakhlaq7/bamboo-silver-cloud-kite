import { useEffect, useState } from "react";
import { LoginPage } from "@/components/messenger/login-page";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/messenger/app-shell";
import { Onboarding } from "@/components/messenger/onboarding";
import { MessengerProvider } from "@/lib/messenger/context";
import { getMyProfile } from "@/lib/messenger/server";
import type { Profile } from "@/lib/messenger/types";
import { VesperMark } from "@/components/messenger/mark";
import { APP_NAME } from "@/lib/messenger/brand";

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <VesperMark className="size-12" />
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{APP_NAME}</h1>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </main>
  );
}

export function MessengerGate({ selectedId }: { selectedId: string | null }) {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");
  const [sel, setSel] = useState<string | null>(selectedId);

  useEffect(() => {
    setSel(selectedId);
  }, [selectedId]);

  useEffect(() => {
    function onPop() {
      const path = window.location.pathname;
      if (path.startsWith("/c/")) {
        setSel(decodeURIComponent(path.slice(3)));
      } else {
        setSel(null);
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile("loading");
      return;
    }
    let alive = true;
    setProfile("loading");
    void getMyProfile()
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {
        if (alive) setProfile(null);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (isPending) return <LoadingScreen label="Opening your inbox…" />;
  if (!user) return <LoginPage />;
  if (profile === "loading") return <LoadingScreen label="Loading your profile…" />;

  if (!profile) {
    const fromEmail = user.primaryEmail?.split("@")[0] || "";
    const suggested = /^[a-z][a-z0-9_]{2,19}$/.test(fromEmail)
      ? fromEmail
      : user.displayName || fromEmail || "you";
    return <Onboarding suggestedName={suggested} onDone={(next) => setProfile(next)} />;
  }

  return (
    <MessengerProvider
      user={user}
      profile={profile}
      selectedId={sel}
      onSelectedId={(id) => {
        setSel(id);
        if (id) {
          window.history.replaceState(null, "", `/c/${encodeURIComponent(id)}`);
        } else {
          window.history.replaceState(null, "", "/");
        }
      }}
    >
      <AppShell />
    </MessengerProvider>
  );
}
