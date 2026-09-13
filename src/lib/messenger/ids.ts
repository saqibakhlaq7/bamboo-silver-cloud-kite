export function dmId(a: string, b: string): string {
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

export function notesId(userId: string): string {
  return `notes:${userId}`;
}

export function isNotesId(id: string): boolean {
  return id.startsWith("notes:");
}

export function isGroupId(id: string): boolean {
  return id.startsWith("g:");
}

export function previewText(body: string, mediaKind?: string | null): string {
  if (mediaKind === "image") return body.trim() ? body : "Photo";
  if (mediaKind === "voice") return "Voice note";
  if (mediaKind === "file") return body.trim() ? body : "File";
  return body.trim() || "Message";
}
