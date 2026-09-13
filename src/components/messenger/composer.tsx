import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ImageIcon, Mic, Paperclip, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blobToVoice, fileToMedia, formatDuration } from "@/lib/messenger/media";
import { useMessenger } from "@/lib/messenger/context";
import { cn } from "@/lib/utils";

export function Composer() {
  const { send, setTyping } = useMessenger();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(Date.now() - startedRef.current), 200);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      setTyping(false);
      recRef.current?.stop();
    };
  }, [setTyping]);

  function onChange(value: string) {
    setText(value);
    setTyping(value.trim().length > 0);
  }

  async function submit(body = text, media?: Parameters<typeof send>[0]["media"]) {
    const next = body.trim();
    if (!next && !media) return;
    setText("");
    setTyping(false);
    await send({ body: next, media: media ?? null });
    taRef.current?.focus();
  }

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const media = await fileToMedia(file);
      await submit(text, media);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not attach that file");
    }
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const duration = Date.now() - startedRef.current;
        if (duration < 400) return;
        void blobToVoice(blob, duration)
          .then((media) => submit("", media))
          .catch((err: unknown) =>
            toast.error(err instanceof Error ? err.message : "Could not send voice note"),
          );
      };
      recRef.current = rec;
      startedRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      rec.start();
    } catch {
      toast.error("Microphone permission is needed for voice notes.");
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="border-t border-border bg-bg/80 px-3 py-3 backdrop-blur-sm">
      {recording ? (
        <div className="mb-2 flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-danger" />
          <span className="tabular-nums text-fg">{formatDuration(elapsed)}</span>
          <span className="text-muted">Recording</span>
          <button
            type="button"
            className="ml-auto text-muted hover:text-fg"
            onClick={() => {
              recRef.current?.stop();
              chunksRef.current = [];
            }}
            aria-label="Cancel recording"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-1.5">
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted"
          onClick={() => imageRef.current?.click()}
          aria-label="Send photo"
        >
          <ImageIcon />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted"
          onClick={() => fileRef.current?.click()}
          aria-label="Send file"
        >
          <Paperclip />
        </Button>
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onPaste={(e) => {
            const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              void onFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);
            }
          }}
          placeholder="Write a message"
          className={cn(
            "max-h-40 min-h-11 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-fg",
            "placeholder:text-faint outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          )}
        />
        <Button
          type="button"
          size="icon-sm"
          variant={recording ? "danger" : "ghost"}
          className={recording ? "" : "text-muted"}
          onClick={() => void toggleRecord()}
          aria-label={recording ? "Stop recording" : "Voice note"}
        >
          {recording ? <Square /> : <Mic />}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          onClick={() => void submit()}
          disabled={!text.trim() && !recording}
          aria-label="Send"
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}
