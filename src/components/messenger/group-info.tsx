import { LogOut, Phone, Search, Star, Timer, UserPlus, Users, Video } from "lucide-react";
import { PersonAvatar } from "@/components/messenger/person-avatar";
import { Button } from "@/components/ui/button";
import { useMessenger } from "@/lib/messenger/context";
import { isArchived, setArchived } from "@/lib/messenger/prefs";
import type { LocalConversation } from "@/lib/messenger/types";
import { cn } from "@/lib/utils";

export function GroupInfo({
  conv,
  onClose,
}: {
  conv: LocalConversation;
  onClose: () => void;
}) {
  const { people, now, setSelectedId } = useMessenger();
  const members = conv.memberIds
    .map((id) => people[id])
    .filter(Boolean);

  return (
    <div className="vesper-scroll flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-col items-center gap-2 pb-4">
        <PersonAvatar name={conv.title} size="lg" now={now} />
        <h2 className="text-lg font-semibold tracking-tight">{conv.title}</h2>
        <p className="text-xs text-muted">{conv.memberIds.length} members</p>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { icon: Phone, label: "Audio" },
          { icon: Video, label: "Video" },
          { icon: UserPlus, label: "Add" },
          { icon: Search, label: "Search" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 rounded-md bg-surface-2 py-3 text-muted">
            <item.icon className="size-4" />
            <span className="text-xs">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm text-muted">Team discussions, updates and files. Keep it professional.</p>
      <ul className="space-y-1">
        <Row icon={Star} label="Starred messages" hint="0" />
        <Row icon={Timer} label="Disappearing messages" hint="Off" />
        <Row icon={Users} label="Members" hint={String(conv.memberIds.length)} />
      </ul>
      <div className="mt-4 space-y-2">
        {members.map((p) => (
          <div key={p.userId} className="flex items-center gap-3 rounded-md px-1 py-2">
            <PersonAvatar name={p.displayName} photo={p.photoData} lastSeen={p.lastSeen} now={now} showOnline size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">{p.displayName}</p>
              <p className="truncate text-xs text-muted">@{p.username}</p>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className={cn("mt-6 justify-start text-danger")}
        onClick={() => {
          setArchived(conv.id, !isArchived(conv.id));
          setSelectedId(null);
          onClose();
        }}
      >
        <LogOut className="size-4" />
        Leave group
      </Button>
    </div>
  );
}

function Row({ icon: Icon, label, hint }: { icon: typeof Star; label: string; hint: string }) {
  return (
    <li className="flex items-center justify-between rounded-md px-2 py-2.5 text-sm">
      <span className="flex items-center gap-3 text-fg">
        <Icon className="size-4 text-muted" />
        {label}
      </span>
      <span className="text-xs text-muted">{hint}</span>
    </li>
  );
}
