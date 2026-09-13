import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CallOverlay } from "@/components/messenger/call-overlay";
import { ChatList } from "@/components/messenger/chat-list";
import { GroupInfo } from "@/components/messenger/group-info";
import { NewChatDialog } from "@/components/messenger/new-chat";
import { ProfilePanel } from "@/components/messenger/profile-panel";
import { SettingsPanel } from "@/components/messenger/settings-panel";
import { Thread } from "@/components/messenger/thread";
import { Button } from "@/components/ui/button";
import { useMessenger } from "@/lib/messenger/context";
import { cn } from "@/lib/utils";

type Rail = "profile" | "settings" | "info";

export function AppShell() {
  const { selectedId, setSelectedId, conversations } = useMessenger();
  const [rail, setRail] = useState<Rail>("profile");
  const [railOpen, setRailOpen] = useState(true);
  const [newChat, setNewChat] = useState(false);
  const [scan, setScan] = useState(false);
  const conv = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (window.matchMedia("(max-width: 1023px)").matches) setRailOpen(false);
        if (window.matchMedia("(max-width: 767px)").matches) setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelectedId]);

  useEffect(() => {
    if (conv?.kind === "group") setRail("info");
    else setRail((current) => (current === "info" ? "profile" : current));
  }, [conv?.id, conv?.kind]);

  const showRail = railOpen && (selectedId || rail === "settings" || rail === "profile");

  return (
    <div className="flex h-dvh min-h-0 bg-bg text-fg">
      <div
        className={cn(
          "h-full w-full min-w-0 border-r border-border md:w-80 md:shrink-0",
          selectedId ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <ChatList
          onOpenProfile={() => {
            setRail("profile");
            setRailOpen(true);
          }}
          onOpenSettings={() => {
            setRail("settings");
            setRailOpen(true);
          }}
          onNewChat={() => {
            setScan(false);
            setNewChat(true);
          }}
          onScan={() => {
            setScan(true);
            setNewChat(true);
          }}
        />
      </div>
      <div className={cn("min-w-0 flex-1", selectedId ? "flex" : "hidden md:flex")}>
        <Thread
          onBack={() => setSelectedId(null)}
          onOpenInfo={() => {
            setRail(conv?.kind === "group" ? "info" : "profile");
            setRailOpen(true);
          }}
        />
      </div>

      {showRail ? (
        <aside
          className={cn(
            "z-30 h-full w-full shrink-0 border-l border-border bg-surface p-5 lg:static lg:flex lg:w-80",
            "fixed inset-y-0 right-0 max-w-md lg:max-w-none",
            selectedId || rail === "settings" || rail === "profile" ? "flex flex-col" : "hidden",
          )}
        >
          <div className="mb-3 flex justify-end lg:hidden">
            <Button size="icon-sm" variant="ghost" aria-label="Close panel" onClick={() => setRailOpen(false)}>
              <X />
            </Button>
          </div>
          {rail === "settings" ? (
            <SettingsPanel
              onOpenProfile={() => {
                setRail("profile");
                setRailOpen(true);
              }}
            />
          ) : rail === "info" && conv?.kind === "group" ? (
            <GroupInfo conv={conv} onClose={() => setRailOpen(false)} />
          ) : (
            <ProfilePanel />
          )}
        </aside>
      ) : null}

      <NewChatDialog open={newChat} onOpenChange={setNewChat} startOnScan={scan} />
      <CallOverlay />
    </div>
  );
}
