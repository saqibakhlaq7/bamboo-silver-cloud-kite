import { Bell, Bookmark, Plus, Search, Settings } from "lucide-react";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { VesperMark } from "@/components/messenger/mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMessenger } from "@/lib/messenger/context";
import { ONLINE_MS } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

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

function alertWhen(at: number, now: number): string {
  const delta = now - at;
  if (delta < 60_000) return "Just now";
  const min = Math.round(delta / 60_000);
  if (min < 60) return `${min}m`;
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatList({
  onOpenProfile,
  onNewChat,
}: {
  onOpenProfile: () => void;
  onNewChat: () => void;
}) {
  const {
    conversations,
    people,
    profile,
    selectedId,
    setSelectedId,
    now,
    alerts,
    markAlertsRead,
    enableAlerts,
    alertsEnabled,
  } = useMessenger();
  const [q, setQ] = useState("");
  const [perm, setPerm] = useState<"granted" | "denied" | "default" | "none">("none");
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPerm(Notification.permission);
  }, [alertsEnabled, alerts.length]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((c) => {
      if (c.title.toLowerCase().includes(needle)) return true;
      if (c.lastMessage.toLowerCase().includes(needle)) return true;
      return c.memberIds.some((id) => {
        const p = people[id];
        return p && (p.username.includes(needle) || p.displayName.toLowerCase().includes(needle));
      });
    });
  }, [conversations, people, q]);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        <VesperMark className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-medium leading-none tracking-tight">Vesper</p>
          <p className="mt-1 truncate text-xs text-muted">@{profile.username}</p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onNewChat} aria-label="New chat">
          <Plus />
        </Button>
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) markAlertsRead();
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Alerts" className="relative">
              <Bell />
              {unreadAlerts > 0 ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-medium">Alerts</p>
              <p className="text-xs text-muted">{alertsEnabled ? "On" : "Off"}</p>
            </div>
            {alertsEnabled && perm === "default" ? (
              <button
                type="button"
                className="w-full border-b border-border px-3 py-2 text-left text-xs text-muted hover:bg-surface-2"
                onClick={() => void enableAlerts()}
              >
                Allow desktop notifications
              </button>
            ) : null}
            {perm === "denied" ? (
              <p className="border-b border-border px-3 py-2 text-xs text-muted">
                Desktop notifications are blocked in this browser.
              </p>
            ) : null}
            <ul className="vesper-scroll max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-muted">No alerts yet</li>
              ) : (
                alerts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surface-2"
                      onClick={() => {
                        if (a.conversationId) setSelectedId(a.conversationId);
                      }}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-fg">{a.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-faint">{alertWhen(a.at, now)}</span>
                      </span>
                      <span className="truncate text-xs text-muted">{a.body}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="icon-sm" variant="ghost" onClick={onOpenProfile} aria-label="Profile">
          <Settings />
        </Button>
      </header>
      <div className="px-3 pb-3 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            className="h-10 pl-9"
          />
        </div>
      </div>
      <ul className="vesper-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
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
                  active ? "bg-surface-2" : "hover:bg-surface",
                )}
              >
                {c.kind === "notes" ? (
                  <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-accent">
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
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-muted">
            {q.trim() ? "No matching chats" : "No conversations yet"}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
