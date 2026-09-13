import { Check, CheckCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/messenger/media";
import type { LocalMessage } from "@/lib/messenger/types";

function Receipt({ status, mine }: { status: LocalMessage["status"]; mine: boolean }) {
  if (!mine) return null;
  if (status === "failed") return <span className="text-[10px] text-danger">Failed</span>;
  if (status === "read") return <CheckCheck className="size-3.5 text-accent" />;
  if (status === "delivered") return <CheckCheck className="size-3.5 text-muted" />;
  return <Check className="size-3.5 text-muted" />;
}

export function MessageBubble({
  message,
  mine,
  onOpenImage,
}: {
  message: LocalMessage;
  mine: boolean;
  onOpenImage?: (src: string) => void;
}) {
  const media = message.media;
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,22rem)] rounded-lg px-3 py-2 text-sm leading-relaxed",
          mine ? "rounded-br-xs bg-accent text-accent-fg" : "rounded-bl-xs bg-surface-2 text-fg",
        )}
      >
        {media?.kind === "image" ? (
          <button
            type="button"
            className="mb-1 block overflow-hidden rounded-sm"
            onClick={() => onOpenImage?.(media.dataUrl)}
          >
            <img src={media.dataUrl} alt={media.name} className="max-h-64 w-full object-cover" />
          </button>
        ) : null}
        {media?.kind === "voice" ? (
          <div className="mb-1 min-w-52">
            <audio src={media.dataUrl} controls className="w-full" />
            {media.durationMs ? (
              <p className={cn("mt-1 text-[11px]", mine ? "text-accent-fg/70" : "text-muted")}>
                {formatDuration(media.durationMs)}
              </p>
            ) : null}
          </div>
        ) : null}
        {media?.kind === "file" ? (
          <a
            href={media.dataUrl}
            download={media.name}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-sm px-2 py-2",
              mine ? "bg-accent-fg/10" : "bg-bg/40",
            )}
          >
            <FileText className="size-4 shrink-0" />
            <span className="truncate text-xs font-medium">{media.name}</span>
          </a>
        ) : null}
        {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums",
            mine ? "text-accent-fg/70" : "text-faint",
          )}
        >
          <time>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
          <Receipt status={message.status} mine={mine} />
        </div>
      </div>
    </div>
  );
}
