import { MAX_AVATAR_CHARS, MAX_MEDIA_CHARS, type LocalMedia, type MediaKind } from "./types";

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

export async function resizeImageDataUrl(
  dataUrl: string,
  maxEdge: number,
  quality = 0.84,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function fileToMedia(file: File): Promise<LocalMedia> {
  const mime = file.type || "application/octet-stream";
  const kind: MediaKind = mime.startsWith("image/") ? "image" : "file";
  let dataUrl = await readAsDataUrl(file);
  if (kind === "image") {
    dataUrl = await resizeImageDataUrl(dataUrl, 1280, 0.82);
  }
  if (dataUrl.length > MAX_MEDIA_CHARS) {
    throw new Error("That file is too large to send (about 1 MB max).");
  }
  return { kind, name: file.name || "file", mime, dataUrl };
}

export async function blobToVoice(blob: Blob, durationMs: number): Promise<LocalMedia> {
  const dataUrl = await readAsDataUrl(blob);
  if (dataUrl.length > MAX_MEDIA_CHARS) {
    throw new Error("That voice note is too long. Try a shorter take.");
  }
  return {
    kind: "voice",
    name: "voice-note.webm",
    mime: blob.type || "audio/webm",
    dataUrl,
    durationMs,
  };
}

export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo.");
  const raw = await readAsDataUrl(file);
  const dataUrl = await resizeImageDataUrl(raw, 320, 0.8);
  if (dataUrl.length > MAX_AVATAR_CHARS) {
    throw new Error("Photo is still too large. Try another.");
  }
  return dataUrl;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
