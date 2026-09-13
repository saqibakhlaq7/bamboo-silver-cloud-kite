import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, FileText, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/messenger/media";
import { isSafeLocalMedia } from "@/lib/messenger/safe-media";
import type { LocalMessage } from "@/lib/messenger/types";

function Receipt({ status, mine }: { status: LocalMessage["status"]; mine: boolean }) {
  if (!mine) return null;
  if (status === "failed") return <span className="text-xs text-danger">Failed</span>;
  if (status === "read") return <CheckCheck className="size-3.5 text-accent" />;
  if (status === "delivered") return <CheckCheck className="size-3.5 opacity-70" />;
  return <Check className="size-3.5 opacity-70" />;
}

function fileSizeLabel(dataUrl: string): string {
  const bytes = Math.max(0, Math.round((dataUrl.length * 3) / 4));
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VoiceNote({ src, durationMs, mine }: { src: string; durationMs?: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setProgress(el.duration ? el.currentTime / el.duration : 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  return (
    <div className="mb-1 flex min-w-52 items-center gap-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          mine ? "bg-bubble-fg/15 text-bubble-fg" : "bg-bg text-fg",
        )}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          if (el.paused) {
            void el.play();
            setPlaying(true);
          } else {
            el.pause();
            setPlaying(false);
          }
        }}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-0.5 rounded-full",
              i / 18 <= progress ? "bg-accent" : mine ? "bg-bubble-fg/35" : "bg-muted",
            )}
            style={{ height: `${6 + ((i * 17) % 12)}px` }}
          />
        ))}
      </div>
      <span className={cn("text-xs tabular-nums", mine ? "text-bubble-fg/70" : "text-muted")}>
        {formatDuration(durationMs ?? 0)}
      </span>
    </div>
  );
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
  const media = isSafeLocalMedia(message.media) ? message.media : null;
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,22rem)] rounded-lg px-3 py-2 text-sm leading-relaxed",
          mine ? "rounded-br-xs bg-bubble text-bubble-fg" : "rounded-bl-xs bg-surface-2 text-fg",
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
          <VoiceNote src={media.dataUrl} durationMs={media.durationMs} mine={mine} />
        ) : null}
        {media?.kind === "file" ? (
          <a
            href={media.dataUrl}
            download={media.name}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-sm px-2 py-2",
              mine ? "bg-bubble-fg/10" : "bg-bg/40",
            )}
          >
            <FileText className="size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{media.name}</span>
              <span className={cn("block text-xs", mine ? "text-bubble-fg/60" : "text-muted")}>
                {fileSizeLabel(media.dataUrl)}
              </span>
            </span>
          </a>
        ) : null}
        {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-xs tabular-nums",
            mine ? "text-bubble-fg/70" : "text-faint",
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
