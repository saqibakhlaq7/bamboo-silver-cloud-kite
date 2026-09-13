import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { QrCard } from "@/components/messenger/qr-card";
import { fileToAvatar } from "@/lib/messenger/media";
import { useMessenger } from "@/lib/messenger/context";
import { APP_NAME, deviceIdFromUser, qrPayload } from "@/lib/messenger/brand";
import { USERNAME_RE } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";

export function ProfilePanel({ className }: { className?: string }) {
  const { profile, refreshProfile } = useMessenger();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [photo, setPhoto] = useState(profile.photoData);
  const [busy, setBusy] = useState(false);
  const payload = qrPayload(profile.username);

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

  async function shareQr() {
    const text = `Add me on ${APP_NAME}: @${profile.username}`;
    try {
      if (navigator.share) await navigator.share({ title: APP_NAME, text });
      else {
        await navigator.clipboard.writeText(payload);
        toast.success("QR payload copied");
      }
    } catch {
      /* dismissed */
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={cn("vesper-scroll flex h-full min-h-0 flex-col gap-5 overflow-y-auto", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Your profile</h2>
        <p className="mt-1 text-xs text-muted">People find you by username. History stays on this device.</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-2">
        <PersonAvatar name={displayName || username} photo={photo} size="lg" />
        <span className="text-xs font-medium text-accent">Change photo</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
      </label>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Device ID</Label>
          <p className="rounded-md bg-surface-2 px-3 py-2.5 font-mono text-xs text-muted">
            {deviceIdFromUser(profile.userId)}
          </p>
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
      <QrCard value={payload} label="Share this QR code to add you" />
      <Button type="button" variant="secondary" onClick={() => void shareQr()}>
        Share QR
      </Button>
      <div className="mt-auto rounded-md bg-surface-2 p-3">
        <p className="mb-2 text-xs text-muted">Account</p>
        <UserButton />
      </div>
    </form>
  );
}
