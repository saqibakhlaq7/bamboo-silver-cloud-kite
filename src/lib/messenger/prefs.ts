const ARCHIVED_KEY = "localchat:archived";

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getArchivedIds(): string[] {
  return readList(ARCHIVED_KEY);
}

export function isArchived(id: string): boolean {
  return getArchivedIds().includes(id);
}

export function setArchived(id: string, archived: boolean): void {
  const next = new Set(getArchivedIds());
  if (archived) next.add(id);
  else next.delete(id);
  try {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event("localchat-prefs"));
  } catch {
    /* ignore */
  }
}
