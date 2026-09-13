import { Archive, Bookmark, Plus, QrCode, Search, Settings } from "lucide-react";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { VesperMark } from "@/components/messenger/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessenger } from "@/lib/messenger/context";
import { APP_NAME, APP_TAGLINE } from "@/lib/messenger/brand";
import { getArchivedIds } from "@/lib/messenger/prefs";
import { ONLINE_MS } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type Filter = "all" | "unread" | "group" | "archived";

function lastSeenLabel(lastSeen: number | null | undefined, now: number): string {
  if (lastSeen == null) return "";
  const delta = now - lastSeen;
  if (delta < ONLINE_MS) return "Online";
  const min = Math.round(delta / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(lastSeen).toLocaleDateString();
}

export function ChatList({
  onOpenProfile,
  onOpenSettings,
  onNewChat,
  onScan,
}: {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onScan: () => void;
}) {
  const { conversations, people, profile, selectedId, setSelectedId, now } = useMessenger();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [archived, setArchived] = useState<string[]>(() => getArchivedIds());

  useEffect(() => {
    const sync = () => setArchived(getArchivedIds());
    window.addEventListener("localchat-prefs", sync);
    return () => window.removeEventListener("localchat-prefs", sync);
  }, []);

  const filtered = useMemo(() => {
    const archivedSet = new Set(archived);
    const needle = q.trim().toLowerCase();
    return conversations.filter((c) => {
      const isArc = archivedSet.has(c.id);
      if (filter === "archived" ? !isArc : isArc) return false;
      if (filter === "unread" && !(c.unread > 0)) return false;
      if (filter === "group" && c.kind !== "group") return false;
      if (!needle) return true;
      if (c.title.toLowerCase().includes(needle)) return true;
      if (c.lastMessage.toLowerCase().includes(needle)) return true;
      return c.memberIds.some((id) => {
        const p = people[id];
        return p && (p.username.includes(needle) || p.displayName.toLowerCase().includes(needle));
      });
    });
  }, [archived, conversations, filter, people, q]);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <VesperMark className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-none tracking-tight">{APP_NAME}</p>
          <p className="mt-1 truncate text-xs text-muted">{APP_TAGLINE}</p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onScan} aria-label="Scan QR code">
          <QrCode />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onNewChat} aria-label="New chat">
          <Plus />
        </Button>
      </header>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, messages..."
            className="h-10 rounded-full border-transparent bg-bg pl-9"
          />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          {(
            [
              ["all", "All"],
              ["unread", "Unread"],
              ["group", "Groups"],
              ["archived", "Archived"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium",
                filter === id ? "bg-accent text-accent-fg" : "bg-bg text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="vesper-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((c) => {
          const other = c.memberIds.find((id) => id !== profile.userId);
          const person = other ? people[other] : null;
          const title =
            c.kind === "group" ? c.title : c.kind === "notes" ? "Saved" : (person?.displayName ?? c.title);
          const photo = c.kind === "dm" ? person?.photoData : null;
          const active = selectedId === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-[background-color] duration-150",
                  active ? "bg-surface-2" : "hover:bg-bg",
                )}
              >
                {c.kind === "notes" ? (
                  <span className="grid size-11 place-items-center rounded-full bg-bg text-accent">
                    <Bookmark className="size-4" />
                  </span>
                ) : (
                  <PersonAvatar
                    name={title}
                    photo={photo}
                    lastSeen={person?.lastSeen}
                    now={now}
                    showOnline={c.kind === "dm"}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-fg">{title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-faint">
                      {c.lastAt
                        ? new Date(c.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-xs text-muted">{c.lastMessage}</span>
                    {c.unread > 0 ? (
                      <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg">
                        {c.unread > 9 ? "9+" : c.unread}
                      </span>
                    ) : c.kind === "dm" ? (
                      <span className="ml-auto shrink-0 text-xs text-faint">
                        {lastSeenLabel(person?.lastSeen, now)}
                      </span>
                    ) : filter === "archived" ? (
                      <Archive className="ml-auto size-3 text-faint" />
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-muted">
            {q.trim() ? "No matching chats" : filter === "archived" ? "No archived chats" : "No conversations yet"}
          </li>
        ) : null}
      </ul>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted hover:bg-bg hover:text-fg"
        >
          <Settings className="size-4" />
          Settings
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="truncate px-2 py-2 text-xs text-muted hover:text-fg"
        >
          @{profile.username}
        </button>
      </div>
    </aside>
  );
}
