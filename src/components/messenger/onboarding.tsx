import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VesperMark } from "@/components/messenger/mark";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { fileToAvatar } from "@/lib/messenger/media";
import { claimProfile } from "@/lib/messenger/server";
import { USERNAME_RE, type Profile } from "@/lib/messenger/types";

export function Onboarding({
  suggestedName,
  onDone,
}: {
  suggestedName: string;
  onDone: (profile: Profile) => void;
}) {
  const [username, setUsername] = useState(
    suggestedName
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20),
  );
  const [displayName, setDisplayName] = useState(suggestedName);
  const [photo, setPhoto] = useState<string | null>(null);
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
    const name = displayName.trim() || handle;
    setBusy(true);
    try {
      const profile = await claimProfile({
        data: { username: handle, displayName: name, photoData: photo },
      });
      onDone(profile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="stagger-in w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel"
      >
        <VesperMark className="size-11" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-fg">
          Choose your handle
        </h1>
        <p className="mt-2 text-sm text-muted">
          People find you by username. Chats stay on this device — there is no cloud backup.
        </p>

        <label className="mt-6 flex cursor-pointer flex-col items-center gap-2">
          <PersonAvatar name={displayName || username || "You"} photo={photo} size="lg" />
          <span className="text-xs font-medium text-muted">Add a photo</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
        </label>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="yourname"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Saving…" : "Enter LocalChat"}
        </Button>
      </form>
    </main>
  );
}
