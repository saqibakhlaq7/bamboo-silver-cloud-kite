const PREF_KEY = "vesper:alerts";

export type InboxAlert = {
  id: string;
  title: string;
  body: string;
  conversationId?: string;
  at: number;
  read: boolean;
};

export function alertsEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAlertsEnabled(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

export function pushBrowserAlert(title: string, body: string, tag: string): void {
  if (!alertsEnabled()) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return;
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* unsupported payload */
  }
}

export function setUnreadTitle(count: number): void {
  if (typeof document === "undefined") return;
  document.title = count > 0 ? `(${count}) LocalChat` : "LocalChat";
}
