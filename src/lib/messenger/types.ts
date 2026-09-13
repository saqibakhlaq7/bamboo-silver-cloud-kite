export type ConversationKind = "dm" | "group" | "notes";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MediaKind = "image" | "file" | "voice";

export type LocalMedia = {
  kind: MediaKind;
  name: string;
  mime: string;
  dataUrl: string;
  durationMs?: number;
};

export type LocalConversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  memberIds: string[];
  lastMessage: string;
  lastAt: number;
  unread: number;
};

export type LocalMessage = {
  id: string;
  conversationId: string;
  fromUserId: string;
  body: string;
  createdAt: number;
  status: MessageStatus;
  media?: LocalMedia | null;
};

export type LocalPerson = {
  userId: string;
  username: string;
  displayName: string;
  photoData: string | null;
  lastSeen: number | null;
};

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  photoData: string | null;
  lastSeen: number;
};

export type DirectoryHit = {
  userId: string;
  username: string;
  displayName: string;
  photoData: string | null;
  lastSeen: number | null;
  online: boolean;
};

export type RelayEvent = {
  id: string;
  conversationId: string;
  fromUserId: string;
  kind: "message" | "invite" | "receipt" | "typing" | "call";
  payload: EventPayload;
  createdAt: number;
};

export type EventPayload = {
  type?: string;
  id?: string;
  conversationId?: string;
  conversationKind?: string;
  conversationTitle?: string;
  memberIds?: string[];
  people?: DirectoryHit[];
  body?: string;
  media?: LocalMedia | null;
  createdAt?: number;
  messageId?: string;
  status?: string;
  action?: string;
  callId?: string;
  video?: boolean;
  sdp?: string;
  ice?: string;
  from?: {
    userId: string;
    username: string;
    displayName: string;
    photoData?: string | null;
  };
};

export type InboxSnapshot = {
  events: RelayEvent[];
  people: DirectoryHit[];
  typing: { conversationId: string; userId: string }[];
  now: number;
};

export const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
export const MAX_TEXT = 4000;
export const MAX_MEDIA_CHARS = 1_400_000;
export const MAX_AVATAR_CHARS = 220_000;
export const ONLINE_MS = 25_000;
