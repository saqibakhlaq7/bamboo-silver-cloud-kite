import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Sql } from "@/lib/db";
import { dmId } from "./ids";
import { isSafeAvatarDataUrl, isSafeMediaDataUrl } from "./safe-media";
import {
  MAX_AVATAR_CHARS,
  MAX_MEDIA_CHARS,
  MAX_TEXT,
  ONLINE_MS,
  USERNAME_RE,
  type DirectoryHit,
  type EventPayload,
  type InboxSnapshot,
  type Profile,
  type RelayEvent,
} from "./types";

async function getDb(): Promise<Sql> {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, "Use 3–20 characters: start with a letter, then letters, numbers, or _");

function toMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const n = Date.parse(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const msg = err instanceof Error ? err.message : String(err);
  return code === "23505" || /unique|duplicate/i.test(msg);
}

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  photo_data: string | null;
  last_seen: unknown;
};

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    photoData: row.photo_data,
    lastSeen: toMs(row.last_seen),
  };
}

function toHit(row: ProfileRow, now: number): DirectoryHit {
  const lastSeen = toMs(row.last_seen);
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    photoData: row.photo_data,
    lastSeen,
    online: now - lastSeen < ONLINE_MS,
  };
}

async function loadProfile(sql: Sql, userId: string): Promise<Profile | null> {
  const rows = await sql<ProfileRow>`
    select user_id, username, display_name, photo_data, last_seen
    from profiles where user_id = ${userId} limit 1
  `;
  return rows[0] ? toProfile(rows[0]) : null;
}

async function requireProfile(sql: Sql, userId: string): Promise<Profile> {
  const profile = await loadProfile(sql, userId);
  if (!profile) throw new Error("Claim a username first");
  return profile;
}

async function isBlocked(sql: Sql, a: string, b: string): Promise<boolean> {
  const rows = await sql<{ n: number }>`
    select 1 as n from blocks
    where (blocker_id = ${a} and blocked_id = ${b})
       or (blocker_id = ${b} and blocked_id = ${a})
    limit 1
  `;
  return rows.length > 0;
}

async function membersOf(sql: Sql, conversationId: string): Promise<string[]> {
  const rows = await sql<{ user_id: string }>`
    select user_id from conversation_members where conversation_id = ${conversationId}
  `;
  return rows.map((r) => r.user_id);
}

async function ensureDm(sql: Sql, me: string, peerId: string): Promise<string> {
  if (me === peerId) throw new Error("Use Saved for notes to yourself");
  if (await isBlocked(sql, me, peerId)) throw new Error("You cannot message this person");
  const peer = await loadProfile(sql, peerId);
  if (!peer) throw new Error("No one with that account");
  const id = dmId(me, peerId);
  await sql`
    insert into conversations (id, kind, title, created_by)
    values (${id}, 'dm', '', ${me})
    on conflict (id) do nothing
  `;
  await sql`
    insert into conversation_members (conversation_id, user_id, role)
    values (${id}, ${me}, 'member')
    on conflict (conversation_id, user_id) do nothing
  `;
  await sql`
    insert into conversation_members (conversation_id, user_id, role)
    values (${id}, ${peerId}, 'member')
    on conflict (conversation_id, user_id) do nothing
  `;
  return id;
}

async function assertMember(sql: Sql, conversationId: string, userId: string): Promise<string[]> {
  const ids = await membersOf(sql, conversationId);
  if (!ids.includes(userId)) throw new Error("You are not in this chat");
  return ids;
}

async function fanout(
  sql: Sql,
  opts: {
    conversationId: string;
    fromUserId: string;
    memberIds: string[];
    kind: string;
    payload: unknown;
    expiresAt?: string | null;
  },
): Promise<void> {
  const payload = JSON.stringify(opts.payload);
  const nowIso = new Date().toISOString();
  for (const to of opts.memberIds) {
    if (to === opts.fromUserId) continue;
    if (await isBlocked(sql, opts.fromUserId, to)) continue;
    const id = crypto.randomUUID();
    if (opts.expiresAt) {
      await sql`
        insert into pending_events
          (id, conversation_id, from_user_id, to_user_id, kind, payload, created_at, expires_at)
        values
          (${id}, ${opts.conversationId}, ${opts.fromUserId}, ${to}, ${opts.kind}, ${payload}, ${nowIso}, ${opts.expiresAt})
      `;
    } else {
      await sql`
        insert into pending_events
          (id, conversation_id, from_user_id, to_user_id, kind, payload, created_at)
        values
          (${id}, ${opts.conversationId}, ${opts.fromUserId}, ${to}, ${opts.kind}, ${payload}, ${nowIso})
      `;
    }
  }
}

async function loadPeople(sql: Sql, ids: string[], now: number): Promise<DirectoryHit[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(",");
  const rows = await sql.query<Omit<ProfileRow, "photo_data"> & { photo_data?: string | null }>(
    `select user_id, username, display_name, last_seen from profiles where user_id in (${placeholders})`,
    unique,
  );
  return rows.map((r) =>
    toHit(
      {
        user_id: r.user_id,
        username: r.username,
        display_name: r.display_name,
        photo_data: null,
        last_seen: r.last_seen,
      },
      now,
    ),
  );
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile | null> => {
    const sql = await getDb();
    return loadProfile(sql, context.userId);
  });

export const claimProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        username: usernameSchema,
        displayName: z.string().trim().min(1).max(40),
        photoData: z
          .union([
            z.null(),
            z
              .string()
              .max(MAX_AVATAR_CHARS)
              .refine((value) => isSafeAvatarDataUrl(value), "Choose a JPEG or PNG photo"),
          ])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<Profile> => {
    const sql = await getDb();
    const existing = await loadProfile(sql, context.userId);
    const photo = data.photoData === undefined ? existing?.photoData ?? null : data.photoData;
    try {
      if (existing) {
        await sql`
          update profiles
          set username = ${data.username},
              display_name = ${data.displayName},
              photo_data = ${photo}
          where user_id = ${context.userId}
        `;
      } else {
        await sql`
          insert into profiles (user_id, username, display_name, photo_data)
          values (${context.userId}, ${data.username}, ${data.displayName}, ${photo ?? null})
        `;
      }
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("That username is taken");
      throw err;
    }
    const profile = await loadProfile(sql, context.userId);
    if (!profile) throw new Error("Could not save profile");
    return profile;
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ q: z.string().trim().min(1).max(20) }).parse(input),
  )
  .handler(async ({ context, data }): Promise<DirectoryHit[]> => {
    const sql = await getDb();
    await requireProfile(sql, context.userId);
    const now = Date.now();
    const needle = `${data.q.toLowerCase()}%`;
    const rows = await sql<ProfileRow>`
      select p.user_id, p.username, p.display_name, p.photo_data, p.last_seen
      from profiles p
      where lower(p.username) like ${needle}
        and p.user_id <> ${context.userId}
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by p.username asc
      limit 8
    `;
    return rows.map((r) => toHit(r, now));
  });

const mediaSchema = z
  .object({
    kind: z.enum(["image", "file", "voice"]),
    name: z.string().max(180),
    mime: z.string().max(120),
    dataUrl: z.string().max(MAX_MEDIA_CHARS),
    durationMs: z.number().int().nonnegative().optional(),
  })
  .refine((media) => isSafeMediaDataUrl(media.kind, media.dataUrl, media.mime), "That file type is not allowed")
  .nullable()
  .optional();

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        conversationId: z.string().min(1).max(200).optional(),
        peerUserId: z.string().min(1).max(80).optional(),
        clientId: z.string().uuid(),
        body: z.string().max(MAX_TEXT),
        media: mediaSchema,
        createdAt: z.number().int(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getDb();
    const me = await requireProfile(sql, context.userId);
    if (!data.body.trim() && !data.media) throw new Error("Write something first");

    const recent = await sql<{ n: string | number }>`
      select count(*) as n from pending_events
      where from_user_id = ${context.userId}
        and kind = 'message'
        and created_at > now() - interval '1 minute'
    `;
    if (Number(recent[0]?.n ?? 0) >= 60) throw new Error("Slow down — too many messages");

    let conversationId = data.conversationId;
    let kind = "dm";
    let title = "";
    if (conversationId?.startsWith("g:")) {
      const rows = await sql<{ kind: string; title: string | null }>`
        select kind, title from conversations where id = ${conversationId} limit 1
      `;
      if (!rows[0]) throw new Error("Chat not found");
      kind = rows[0].kind;
      title = rows[0].title ?? "";
      await assertMember(sql, conversationId, context.userId);
    } else if (data.peerUserId) {
      conversationId = await ensureDm(sql, context.userId, data.peerUserId);
    } else if (conversationId?.startsWith("dm:")) {
      const parts = conversationId.split(":");
      const peer = parts.slice(1).find((id) => id && id !== context.userId);
      if (!peer) throw new Error("Invalid chat");
      conversationId = await ensureDm(sql, context.userId, peer);
    } else {
      throw new Error("Pick someone to message");
    }

    const memberIds = await membersOf(sql, conversationId);
    const payload = {
      type: "message",
      id: data.clientId,
      conversationId,
      conversationKind: kind,
      conversationTitle: title,
      memberIds,
      body: data.body,
      media: data.media ?? null,
      createdAt: data.createdAt,
      from: {
        userId: me.userId,
        username: me.username,
        displayName: me.displayName,
        photoData: me.photoData,
      },
    };
    await fanout(sql, {
      conversationId,
      fromUserId: context.userId,
      memberIds,
      kind: "message",
      payload,
    });
    return { conversationId, memberIds };
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(40),
        memberUserIds: z.array(z.string().min(1).max(80)).max(19),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getDb();
    const me = await requireProfile(sql, context.userId);
    const memberIds = [...new Set([context.userId, ...data.memberUserIds])];
    if (memberIds.length < 2) throw new Error("Add at least one other person");
    for (const id of memberIds) {
      if (id === context.userId) continue;
      if (await isBlocked(sql, context.userId, id)) throw new Error("Someone you blocked is in the list");
      const p = await loadProfile(sql, id);
      if (!p) throw new Error("One of those usernames is not on LocalChat");
    }
    const conversationId = `g:${crypto.randomUUID()}`;
    await sql`
      insert into conversations (id, kind, title, created_by)
      values (${conversationId}, 'group', ${data.title}, ${context.userId})
    `;
    for (const id of memberIds) {
      const role = id === context.userId ? "admin" : "member";
      await sql`
        insert into conversation_members (conversation_id, user_id, role)
        values (${conversationId}, ${id}, ${role})
      `;
    }
    const people = await loadPeople(sql, memberIds, Date.now());
    await fanout(sql, {
      conversationId,
      fromUserId: context.userId,
      memberIds,
      kind: "invite",
      payload: {
        type: "invite",
        conversationId,
        conversationKind: "group",
        conversationTitle: data.title,
        memberIds,
        from: { userId: me.userId, username: me.username, displayName: me.displayName },
      },
    });
    return { conversationId, memberIds, people };
  });

export const sendReceipts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        conversationId: z.string().min(1).max(200),
        items: z
          .array(
            z.object({
              messageId: z.string().min(1).max(80),
              toUserId: z.string().min(1).max(80),
            }),
          )
          .max(80),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getDb();
    await requireProfile(sql, context.userId);
    const members = await assertMember(sql, data.conversationId, context.userId);
    for (const item of data.items) {
      if (!members.includes(item.toUserId) || item.toUserId === context.userId) continue;
      await fanout(sql, {
        conversationId: data.conversationId,
        fromUserId: context.userId,
        memberIds: [item.toUserId, context.userId],
        kind: "receipt",
        payload: {
          type: "receipt",
          messageId: item.messageId,
          conversationId: data.conversationId,
          status: "read",
        },
      });
    }
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ userId: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("You cannot block yourself");
    const sql = await getDb();
    await requireProfile(sql, context.userId);
    await sql`
      insert into blocks (blocker_id, blocked_id)
      values (${context.userId}, ${data.userId})
      on conflict (blocker_id, blocked_id) do nothing
    `;
    return { ok: true };
  });

export const sendCallSignal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        conversationId: z.string().min(1).max(200),
        toUserId: z.string().min(1).max(80),
        callId: z.string().min(1).max(80),
        action: z.enum(["invite", "accept", "reject", "hangup", "offer", "answer", "ice"]),
        video: z.boolean(),
        sdp: z.string().max(32_768).optional(),
        ice: z.string().max(4096).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getDb();
    const me = await requireProfile(sql, context.userId);
    if (data.toUserId === context.userId) throw new Error("Cannot call yourself");
    let conversationId = data.conversationId;
    if (conversationId.startsWith("dm:")) {
      const parts = conversationId.split(":");
      const peer = parts.slice(1).find((id) => id && id !== context.userId);
      if (!peer || peer !== data.toUserId) throw new Error("Invalid chat");
      conversationId = await ensureDm(sql, context.userId, peer);
    }
    const members = await assertMember(sql, conversationId, context.userId);
    if (!members.includes(data.toUserId)) throw new Error("Not in this chat");
    if (await isBlocked(sql, context.userId, data.toUserId)) throw new Error("You cannot call this person");
    const expires = new Date(Date.now() + 60_000).toISOString();
    await fanout(sql, {
      conversationId,
      fromUserId: context.userId,
      memberIds: [data.toUserId, context.userId],
      kind: "call",
      payload: {
        type: "call",
        action: data.action,
        callId: data.callId,
        video: data.video,
        sdp: data.sdp,
        ice: data.ice,
        conversationId,
        from: {
          userId: me.userId,
          username: me.username,
          displayName: me.displayName,
          photoData: data.action === "invite" ? me.photoData : undefined,
        },
      },
      expiresAt: expires,
    });
    return { ok: true };
  });

export const syncInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        ackIds: z.array(z.string().min(1).max(80)).max(100),
        typingConversationId: z.string().min(1).max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<InboxSnapshot> => {
    const sql = await getDb();
    const me = await loadProfile(sql, context.userId);
    if (!me) {
      return { events: [], people: [], typing: [], now: Date.now() };
    }

    if (Date.now() - me.lastSeen > 8_000) {
      await sql`update profiles set last_seen = now() where user_id = ${context.userId}`;
    }

    if (data.ackIds.length) {
      const placeholders = data.ackIds.map((_, i) => `$${i + 2}`).join(",");
      const acked = await sql.query<{
        id: string;
        from_user_id: string;
        conversation_id: string;
        kind: string;
        payload: string;
      }>(
        `delete from pending_events
         where to_user_id = $1 and id in (${placeholders})
         returning id, from_user_id, conversation_id, kind, payload`,
        [context.userId, ...data.ackIds],
      );
      for (const row of acked) {
        if (row.kind !== "message") continue;
        let messageId = "";
        try {
          messageId = String((JSON.parse(row.payload) as { id?: string }).id ?? "");
        } catch {
          messageId = "";
        }
        if (messageId && row.from_user_id !== context.userId) {
          await fanout(sql, {
            conversationId: row.conversation_id,
            fromUserId: context.userId,
            memberIds: [row.from_user_id, context.userId],
            kind: "receipt",
            payload: {
              type: "receipt",
              messageId,
              conversationId: row.conversation_id,
              status: "delivered",
            },
          });
        }
      }
    }

    if (Math.random() < 0.03) {
      await sql`delete from pending_events where expires_at is not null and expires_at < now()`;
    }

    if (data.typingConversationId) {
      try {
        const members = await assertMember(sql, data.typingConversationId, context.userId);
        await sql`
          delete from pending_events
          where from_user_id = ${context.userId}
            and kind = 'typing'
            and conversation_id = ${data.typingConversationId}
        `;
        const expires = new Date(Date.now() + 4000).toISOString();
        await fanout(sql, {
          conversationId: data.typingConversationId,
          fromUserId: context.userId,
          memberIds: members,
          kind: "typing",
          payload: { type: "typing", conversationId: data.typingConversationId },
          expiresAt: expires,
        });
      } catch {
        /* ignore typing on chats we left */
      }
    } else if (data.typingConversationId === null) {
      await sql`
        delete from pending_events
        where from_user_id = ${context.userId} and kind = 'typing'
      `;
    }

    const rows = await sql<{
      id: string;
      conversation_id: string;
      from_user_id: string;
      kind: string;
      payload: string;
      created_at: unknown;
    }>`
      select id, conversation_id, from_user_id, kind, payload, created_at
      from pending_events
      where to_user_id = ${context.userId}
        and (expires_at is null or expires_at > now())
      order by created_at asc
      limit 50
    `;

    const events: RelayEvent[] = [];
    const typing: { conversationId: string; userId: string }[] = [];

    for (const row of rows) {
      let payload: EventPayload = {};
      try {
        payload = JSON.parse(row.payload) as EventPayload;
      } catch {
        payload = {};
      }
      if (row.kind === "typing") {
        typing.push({ conversationId: row.conversation_id, userId: row.from_user_id });
        continue;
      }
      events.push({
        id: row.id,
        conversationId: row.conversation_id,
        fromUserId: row.from_user_id,
        kind: row.kind as RelayEvent["kind"],
        payload,
        createdAt: toMs(row.created_at),
      });
    }

    const now = Date.now();
    const peopleRows = await sql<Omit<ProfileRow, "photo_data">>`
      select p.user_id, p.username, p.display_name, p.last_seen
      from profiles p
      where p.user_id <> ${context.userId}
        and p.user_id in (
          select distinct cm2.user_id
          from conversation_members cm1
          join conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
          where cm1.user_id = ${context.userId}
        )
    `;
    const people = peopleRows.map((r) =>
      toHit(
        {
          user_id: r.user_id,
          username: r.username,
          display_name: r.display_name,
          photo_data: null,
          last_seen: r.last_seen,
        },
        now,
      ),
    );

    return { events, people, typing, now };
  });
