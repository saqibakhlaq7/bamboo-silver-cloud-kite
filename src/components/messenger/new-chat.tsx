import { useEffect, useRef, useState } from "react";
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
import { parseQrPayload } from "@/lib/messenger/brand";
import type { DirectoryHit } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";

type Tab = "dm" | "group" | "scan";

export function NewChatDialog({
  open,
  onOpenChange,
  startOnScan = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startOnScan?: boolean;
}) {
  const { searchUsers, openDm, createGroup, now, setSelectedId } = useMessenger();
  const [tab, setTab] = useState<Tab>("dm");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<DirectoryHit[]>([]);
  const [picked, setPicked] = useState<DirectoryHit[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanHint, setScanHint] = useState("Point your camera at a QR code");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) setTab(startOnScan ? "scan" : "dm");
  }, [open, startOnScan]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!q.trim() || tab === "scan") {
        setHits([]);
        return;
      }
      void searchUsers(q.trim())
        .then(setHits)
        .catch(() => {
          setHits([]);
          toast.error("Could not search");
        });
    }, 180);
    return () => clearTimeout(t);
  }, [q, open, searchUsers, tab]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setPicked([]);
      setTitle("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "scan") return;
    let stream: MediaStream | null = null;
    let alive = true;
    const video = videoRef.current;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!alive || !video) return;
        video.srcObject = stream;
        await video.play();
        type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
        const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        if (!Ctor) {
          setScanHint("This browser cannot scan QR. Search a username instead.");
          return;
        }
        const det = new Ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (!alive || !video) return;
          try {
            const codes = await det.detect(video);
            for (const code of codes) {
              const handle = parseQrPayload(code.rawValue);
              if (!handle) continue;
              const found = await searchUsers(handle);
              const hit = found.find((h) => h.username === handle) ?? found[0];
              if (hit) {
                const id = await openDm(hit);
                setSelectedId(id);
                onOpenChange(false);
                return;
              }
              setScanHint(`No one named @${handle}`);
            }
          } catch {
            /* keep scanning */
          }
          if (alive) window.setTimeout(() => void tick(), 400);
        };
        void tick();
      } catch {
        setScanHint("Camera permission is needed to scan.");
      }
    })();
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, tab, onOpenChange, openDm, searchUsers, setSelectedId]);

  async function pick(hit: DirectoryHit) {
    if (tab === "dm" || tab === "scan") {
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
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>Search a username, start a group, or scan a QR code.</DialogDescription>
        </DialogHeader>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-md bg-bg p-1">
          {([
            ["dm", "Direct"],
            ["group", "Group"],
            ["scan", "Scan QR"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "h-9 rounded-sm text-sm font-medium",
                tab === id ? "bg-surface-2 text-fg" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "scan" ? (
          <div className="space-y-3">
            <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-lg bg-bg object-cover" />
            <p className="text-center text-sm text-muted">{scanHint}</p>
          </div>
        ) : (
          <>
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
              placeholder="Search or enter username"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
