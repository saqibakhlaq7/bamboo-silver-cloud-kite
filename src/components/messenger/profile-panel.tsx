import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { fileToAvatar } from "@/lib/messenger/media";
import { useMessenger } from "@/lib/messenger/context";
import { USERNAME_RE } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";

export function ProfilePanel({ className }: { className?: string }) {
  const { profile, refreshProfile, alertsEnabled, setAlertsOn, enableAlerts } = useMessenger();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [photo, setPhoto] = useState(profile.photoData);
  const [busy, setBusy] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await fileToAvatar(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not use that photo");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      toast.error("Username must start with a letter, 3–20 characters.");
      return;
    }
    setBusy(true);
    try {
      await refreshProfile({
        username: handle,
        displayName: displayName.trim() || handle,
        photoData: photo,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={cn("flex h-full flex-col gap-5", className)}>
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted">
          Your handle is public so people can find you. Message history never leaves this browser.
        </p>
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-2">
        <PersonAvatar name={displayName || username} photo={photo} size="lg" />
        <span className="text-xs font-medium text-muted">Change photo</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
      </label>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>

      <div className="rounded-md border border-border bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Desktop alerts</p>
            <p className="mt-0.5 text-xs text-muted">
              Notify when a message or call arrives and this tab is in the background.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={alertsEnabled}
            aria-label="Desktop alerts"
            onClick={() => {
              if (alertsEnabled) setAlertsOn(false);
              else void enableAlerts();
            }}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-[background-color] duration-150",
              alertsEnabled ? "bg-accent" : "border border-border bg-surface",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-6 rounded-full transition-transform duration-150",
                alertsEnabled ? "translate-x-5 bg-accent-fg" : "translate-x-0.5 bg-fg",
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-auto rounded-md border border-border bg-surface-2 p-3">
        <p className="mb-2 text-xs text-muted">Account</p>
        <UserButton />
      </div>
    </form>
  );
}
