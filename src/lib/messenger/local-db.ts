import Dexie, { type Table } from "dexie";
import { notesId } from "./ids";
import type { LocalConversation, LocalMessage, LocalPerson } from "./types";

export class VesperDB extends Dexie {
  conversations!: Table<LocalConversation, string>;
  messages!: Table<LocalMessage, string>;
  people!: Table<LocalPerson, string>;

  constructor(userId: string) {
    super(`vesper:${userId}`);
    this.version(1).stores({
      conversations: "id, lastAt, kind",
      messages: "id, conversationId, createdAt, [conversationId+createdAt]",
      people: "userId, username",
    });
  }
}

const cache = new Map<string, VesperDB>();

export function getLocalDb(userId: string): VesperDB {
  let db = cache.get(userId);
  if (!db) {
    db = new VesperDB(userId);
    cache.set(userId, db);
  }
  return db;
}

export async function ensureNotes(db: VesperDB, userId: string): Promise<void> {
  const id = notesId(userId);
  const existing = await db.conversations.get(id);
  if (existing) return;
  await db.conversations.put({
    id,
    kind: "notes",
    title: "Saved",
    memberIds: [userId],
    lastMessage: "Private notes on this device",
    lastAt: Date.now(),
    unread: 0,
  });
}

export async function upsertPerson(db: VesperDB, person: LocalPerson): Promise<void> {
  await db.people.put(person);
}

export async function bumpConversation(
  db: VesperDB,
  patch: Pick<LocalConversation, "id" | "kind" | "title" | "memberIds"> & {
    lastMessage: string;
    lastAt: number;
    unreadDelta?: number;
    resetUnread?: boolean;
  },
): Promise<void> {
  const prev = await db.conversations.get(patch.id);
  const unread = patch.resetUnread
    ? 0
    : (prev?.unread ?? 0) + (patch.unreadDelta ?? 0);
  await db.conversations.put({
    id: patch.id,
    kind: patch.kind,
    title: patch.title || prev?.title || "Chat",
    memberIds: patch.memberIds.length ? patch.memberIds : (prev?.memberIds ?? []),
    lastMessage: patch.lastMessage,
    lastAt: patch.lastAt,
    unread,
  });
}
