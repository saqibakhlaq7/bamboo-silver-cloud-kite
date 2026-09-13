import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { useMessenger } from "@/lib/messenger/context";
import type { DirectoryHit } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";

export function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { searchUsers, openDm, createGroup, now, setSelectedId } = useMessenger();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<DirectoryHit[]>([]);
  const [picked, setPicked] = useState<DirectoryHit[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!q.trim()) {
        setHits([]);
        return;
      }
      void searchUsers(q.trim())
        .then(setHits)
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q, open, searchUsers]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setPicked([]);
      setTitle("");
      setTab("dm");
    }
  }, [open]);

  async function pick(hit: DirectoryHit) {
    if (tab === "dm") {
      setBusy(true);
      try {
        const id = await openDm(hit);
        setSelectedId(id);
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start chat");
      } finally {
        setBusy(false);
      }
      return;
    }
    setPicked((prev) => (prev.some((p) => p.userId === hit.userId) ? prev : [...prev, hit]));
    setQ("");
    setHits([]);
  }

  async function makeGroup() {
    if (!title.trim() || picked.length === 0) return;
    setBusy(true);
    try {
      const id = await createGroup(title.trim(), picked);
      setSelectedId(id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>Find someone by username, or start a group.</DialogDescription>
        </DialogHeader>
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
          {(["dm", "group"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-9 rounded-sm text-sm font-medium",
                tab === t ? "bg-surface-2 text-fg" : "text-muted",
              )}
            >
              {t === "dm" ? "Direct" : "Group"}
            </button>
          ))}
        </div>
        {tab === "group" ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name"
            className="mb-2"
          />
        ) : null}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username"
          autoFocus
        />
        {tab === "group" && picked.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {picked.map((p) => (
              <button
                key={p.userId}
                type="button"
                className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg"
                onClick={() => setPicked((prev) => prev.filter((x) => x.userId !== p.userId))}
              >
                @{p.username}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="vesper-scroll mt-3 max-h-64 space-y-1 overflow-y-auto">
          {hits.map((hit) => (
            <li key={hit.userId}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pick(hit)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-2"
              >
                <PersonAvatar
                  name={hit.displayName}
                  photo={hit.photoData}
                  lastSeen={hit.lastSeen}
                  now={now}
                  showOnline
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{hit.displayName}</span>
                  <span className="block truncate text-xs text-muted">@{hit.username}</span>
                </span>
              </button>
            </li>
          ))}
          {q.trim() && hits.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted">No one with that username</li>
          ) : null}
        </ul>
        {tab === "group" ? (
          <Button className="mt-3 w-full" disabled={busy || !title.trim() || picked.length === 0} onClick={() => void makeGroup()}>
            Create group
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
