import { useEffect, useState } from "react";
import { CallOverlay } from "@/components/messenger/call-overlay";
import { ChatList } from "@/components/messenger/chat-list";
import { NewChatDialog } from "@/components/messenger/new-chat";
import { ProfilePanel } from "@/components/messenger/profile-panel";
import { Thread } from "@/components/messenger/thread";
import { useMessenger } from "@/lib/messenger/context";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { selectedId, setSelectedId } = useMessenger();
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChat, setNewChat] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        if (window.matchMedia("(max-width: 767px)").matches) setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelectedId]);

  return (
    <div className="flex h-dvh min-h-0 bg-bg text-fg">
      <div
        className={cn(
          "h-full w-full min-w-0 border-r border-border md:w-[20.5rem] md:shrink-0",
          selectedId ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <ChatList onOpenProfile={() => setProfileOpen(true)} onNewChat={() => setNewChat(true)} />
      </div>
      <div className={cn("min-w-0 flex-1", selectedId ? "flex" : "hidden md:flex")}>
        <Thread onBack={() => setSelectedId(null)} />
      </div>

      <NewChatDialog open={newChat} onOpenChange={setNewChat} />

      {profileOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-bg/60" onClick={() => setProfileOpen(false)}>
          <aside
            className="h-full w-full max-w-md border-l border-border bg-surface p-5 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <ProfilePanel />
          </aside>
        </div>
      ) : null}

      <CallOverlay />
    </div>
  );
}
