import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, Ban, MoreVertical, Phone, Video } from "lucide-react";
import { isArchived, setArchived } from "@/lib/messenger/prefs";
import { Composer } from "@/components/messenger/composer";
import { MessageBubble } from "@/components/messenger/message-bubble";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMessenger } from "@/lib/messenger/context";
import { ONLINE_MS } from "@/lib/messenger/types";

function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-2">
      <span className="typing-dot size-1.5 rounded-full bg-muted" />
      <span className="typing-dot size-1.5 rounded-full bg-muted" />
      <span className="typing-dot size-1.5 rounded-full bg-muted" />
    </div>
  );
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Thread({ onBack, onOpenInfo }: { onBack: () => void; onOpenInfo?: () => void }) {
  const { selectedId, conversations, messages, people, profile, typing, now, block, setSelectedId, startCall } =
    useMessenger();
  const scroller = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const conv = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId, typing]);

  const otherId = conv?.memberIds.find((id) => id !== profile.userId);
  const other = otherId ? people[otherId] : null;
  const title =
    conv?.kind === "group"
      ? conv.title
      : conv?.kind === "notes"
        ? "Saved"
        : (other?.displayName ?? conv?.title ?? "Chat");
  const subtitle =
    conv?.kind === "group"
      ? `${conv.memberIds.length} members`
      : conv?.kind === "notes"
        ? "Private notes on this device"
        : other?.lastSeen != null && now - other.lastSeen < ONLINE_MS
          ? "Online"
          : other?.username
            ? `@${other.username}`
            : "";

  const grouped = useMemo(() => {
    const out: { key: string; ts: number; items: typeof messages }[] = [];
    for (const m of messages) {
      const key = new Date(m.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, ts: m.createdAt, items: [m] });
    }
    return out;
  }, [messages]);

  const typingHere = (typing[selectedId ?? ""] ?? []).filter((id) => id !== profile.userId);

  if (!selectedId) {
    return (
      <div className="hidden h-full flex-col items-center justify-center bg-thread thread-grid md:flex">
        <p className="text-2xl font-semibold tracking-tight text-fg">Pick a conversation</p>
        <p className="mt-2 max-w-xs text-center text-sm text-muted">
          Start a chat by username, or write in Saved — it never leaves this browser.
        </p>
      </div>
    );
  }

  if (!conv) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-bg">
        <header className="flex items-center gap-2 border-b border-border px-2 py-2.5 md:px-4">
          <Button size="icon-sm" variant="ghost" className="md:hidden" onClick={onBack} aria-label="Back">
            <ArrowLeft />
          </Button>
          <p className="text-sm font-medium text-fg">Chat unavailable</p>
        </header>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <p className="max-w-xs text-sm text-muted">
            This conversation is not on this device. History stays in the browser where it was received.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-thread">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2.5 md:px-4">
        <Button size="icon-sm" variant="ghost" className="md:hidden" onClick={onBack} aria-label="Back">
          <ArrowLeft />
        </Button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onOpenInfo}>
          <PersonAvatar
            name={title}
            photo={conv.kind === "dm" ? other?.photoData : null}
            lastSeen={other?.lastSeen}
            now={now}
            showOnline={conv.kind === "dm"}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{title}</p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
        </button>
        {conv.kind === "dm" && otherId ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Voice call"
                  onClick={() => void startCall(otherId, conv.id, false)}
                >
                  <Phone />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice call</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Video call"
                  onClick={() => void startCall(otherId, conv.id, true)}
                >
                  <Video />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Chat actions">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setArchived(conv.id, !isArchived(conv.id));
                    setSelectedId(null);
                  }}
                >
                  <Archive className="size-4" />
                  {isArchived(conv.id) ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-danger"
                  onSelect={() => {
                    void block(otherId);
                    setSelectedId(null);
                  }}
                >
                  <Ban className="size-4" />
                  Block @{other?.username ?? "user"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : conv.kind === "group" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Chat actions">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setArchived(conv.id, !isArchived(conv.id));
                  setSelectedId(null);
                }}
              >
                <Archive className="size-4" />
                {isArchived(conv.id) ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div ref={scroller} className="vesper-scroll thread-grid min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 md:px-6">
        {grouped.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted">No messages yet. Say hello.</p>
        ) : null}
        {grouped.map((g) => (
          <div key={g.key} className="space-y-2">
            <p className="py-2 text-center text-xs font-medium uppercase tracking-wider text-faint">
              {dayLabel(g.ts)}
            </p>
            {g.items.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={m.fromUserId === profile.userId}
                onOpenImage={setImage}
              />
            ))}
          </div>
        ))}
        {typingHere.length > 0 ? (
          <div className="flex justify-start">
            <TypingDots />
          </div>
        ) : null}
      </div>
      <Composer />

      <Dialog open={Boolean(image)} onOpenChange={(o) => !o && setImage(null)}>
        <DialogContent className="max-w-3xl bg-bg p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo</DialogTitle>
            <DialogDescription>Full size</DialogDescription>
          </DialogHeader>
          {image ? <img src={image} alt="" className="max-h-[80dvh] w-full rounded-md object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
