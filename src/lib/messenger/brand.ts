export const APP_NAME = "LocalChat";
export const APP_TAGLINE = "Private. Simple. Yours.";

export function deviceIdFromUser(userId: string): string {
  const hex = userId.replace(/[^a-z0-9]/gi, "").toLowerCase().padEnd(12, "0").slice(0, 12);
  return `${hex.slice(0, 5)}-${hex.slice(5, 9)}-${hex.slice(9, 12)}`;
}

export function qrPayload(username: string): string {
  return `localchat:${username.trim().toLowerCase()}`;
}

export function parseQrPayload(raw: string): string | null {
  const v = raw.trim();
  const prefixed = v.match(/^localchat:([a-z][a-z0-9_]{2,19})$/i);
  if (prefixed) return prefixed[1].toLowerCase();
  if (/^[a-z][a-z0-9_]{2,19}$/i.test(v)) return v.toLowerCase();
  return null;
}
