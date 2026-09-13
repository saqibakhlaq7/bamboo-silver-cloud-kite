import { Bell, Database, Globe, Info, Lock, MessageSquare, UserRound } from "lucide-react";
import { useMessenger } from "@/lib/messenger/context";
import { APP_NAME, APP_TAGLINE } from "@/lib/messenger/brand";
import { cn } from "@/lib/utils";

const ROWS = [
  { icon: UserRound, title: "Account", body: "Profile, device ID, QR" },
  { icon: Lock, title: "Privacy", body: "Last seen, read receipts, block" },
  { icon: MessageSquare, title: "Chat settings", body: "Media, wallpaper, preview" },
  { icon: Bell, title: "Notifications", body: "Calls, sounds, desktop alerts" },
  { icon: Database, title: "Storage", body: "Manage local data" },
  { icon: Globe, title: "Language", body: "English" },
  { icon: Info, title: "About", body: "Version 1.0.0" },
] as const;

export function SettingsPanel({
  onOpenProfile,
}: {
  onOpenProfile: () => void;
}) {
  const { alertsEnabled, setAlertsOn, enableAlerts } = useMessenger();

  return (
    <div className="vesper-scroll flex h-full min-h-0 flex-col overflow-y-auto">
      <h2 className="px-1 text-lg font-semibold tracking-tight">Settings</h2>
      <ul className="mt-4 space-y-1">
        {ROWS.map((row) => (
          <li key={row.title}>
            <button
              type="button"
              onClick={() => {
                if (row.title === "Account") onOpenProfile();
                if (row.title === "Notifications") {
                  if (alertsEnabled) setAlertsOn(false);
                  else void enableAlerts();
                }
              }}
              className="flex w-full items-start gap-3 rounded-md px-2 py-3 text-left hover:bg-surface-2"
            >
              <row.icon className="mt-0.5 size-4 text-muted" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">{row.title}</span>
                <span className="block text-xs text-muted">
                  {row.title === "Notifications" ? (alertsEnabled ? "On" : "Off") : row.body}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-auto rounded-md bg-surface-2 px-3 py-3 text-xs leading-relaxed text-muted",
        )}
      >
        All data is stored only on this device. No backup, no cloud, no tracking. {APP_NAME} — {APP_TAGLINE}
      </p>
    </div>
  );
}
