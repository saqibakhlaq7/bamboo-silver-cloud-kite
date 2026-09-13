import { cn } from "@/lib/utils";
import { isSafeAvatarDataUrl } from "@/lib/messenger/safe-media";
import { ONLINE_MS } from "@/lib/messenger/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PersonAvatar({
  name,
  photo,
  lastSeen,
  now,
  size = "md",
  showOnline = false,
}: {
  name: string;
  photo?: string | null;
  lastSeen?: number | null;
  now?: number;
  size?: "sm" | "md" | "lg";
  showOnline?: boolean;
}) {
  const dim = size === "sm" ? "size-9 text-[11px]" : size === "lg" ? "size-16 text-lg" : "size-11 text-sm";
  const online = showOnline && lastSeen != null && now != null && now - lastSeen < ONLINE_MS;
  const safePhoto = photo && isSafeAvatarDataUrl(photo) ? photo : null;
  return (
    <span className="relative inline-flex shrink-0">
      {safePhoto ? (
        <img
          src={safePhoto}
          alt=""
          className={cn("rounded-full object-cover bg-surface-2", dim)}
        />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-surface-2 font-medium text-accent",
            dim,
          )}
        >
          {initials(name)}
        </span>
      )}
      {online ? (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-online ring-2 ring-bg" />
      ) : null}
    </span>
  );
}
