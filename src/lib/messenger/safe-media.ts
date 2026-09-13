import { MAX_AVATAR_CHARS, MAX_MEDIA_CHARS, type LocalMedia, type MediaKind } from "./types.ts";

const DATA_URL_RE =
  /^data:([a-z0-9!#$&.+\-^_]+\/[a-z0-9!#$&.+\-^_+]+)((?:;[a-z0-9!#$&.+\-^_]+=[^;,]+)*)?;base64,([a-z0-9+/]+=*)$/i;

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);
const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "video/webm",
]);
const EXECUTABLE_MIMES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/xml",
  "application/xml",
  "application/xhtml+xml",
]);

function baseMime(value: string): string {
  return value.toLowerCase().split(";")[0]?.trim() ?? "";
}

export function parseDataUrl(dataUrl: string): { mime: string } | null {
  if (!dataUrl || dataUrl.length > MAX_MEDIA_CHARS) return null;
  if (dataUrl.startsWith("javascript:") || dataUrl.startsWith("data:text/html")) return null;
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  return { mime: baseMime(match[1]) };
}

export function isSafeAvatarDataUrl(dataUrl: string): boolean {
  if (dataUrl.length > MAX_AVATAR_CHARS) return false;
  const parsed = parseDataUrl(dataUrl);
  return Boolean(parsed && IMAGE_MIMES.has(parsed.mime) && parsed.mime !== "image/gif");
}

export function isSafeMediaDataUrl(kind: MediaKind, dataUrl: string, mime: string): boolean {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed || EXECUTABLE_MIMES.has(parsed.mime)) return false;
  const declared = baseMime(mime);
  if (declared && declared !== parsed.mime) return false;
  if (kind === "image") return IMAGE_MIMES.has(parsed.mime);
  if (kind === "voice") return AUDIO_MIMES.has(parsed.mime);
  return !EXECUTABLE_MIMES.has(parsed.mime);
}

export function isSafeLocalMedia(media: LocalMedia | null | undefined): media is LocalMedia {
  if (!media) return false;
  return isSafeMediaDataUrl(media.kind, media.dataUrl, media.mime);
}

export function sanitizeLocalMedia(media: LocalMedia | null | undefined): LocalMedia | null {
  return isSafeLocalMedia(media) ? media : null;
}

export function sanitizeAvatar(photo: string | null | undefined): string | null {
  if (!photo) return null;
  return isSafeAvatarDataUrl(photo) ? photo : null;
}
