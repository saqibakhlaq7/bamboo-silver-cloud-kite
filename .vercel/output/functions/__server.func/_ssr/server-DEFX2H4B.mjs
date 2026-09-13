import { A as boolean, D as _enum, F as object, P as number, R as string, k as array } from "../_libs/@better-auth/core+[...].mjs";
import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { a as USERNAME_RE, i as ONLINE_MS, n as MAX_MEDIA_CHARS, o as authMiddleware, r as MAX_TEXT, t as MAX_AVATAR_CHARS } from "./types-DHZ9OTkD.mjs";
import { t as dmId } from "./ids-D_oUFC7O.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-DEFX2H4B.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
async function getDb() {
	const { getSql } = await import("./db-uydQd5OC.mjs").then((n) => n.t).then((n) => n.t);
	return getSql();
}
var usernameSchema = string().trim().toLowerCase().regex(USERNAME_RE, "Use 3–20 characters: start with a letter, then letters, numbers, or _");
function toMs(value) {
	if (value instanceof Date) return value.getTime();
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value) {
		const n = Date.parse(value);
		return Number.isNaN(n) ? 0 : n;
	}
	return 0;
}
function isUniqueViolation(err) {
	const code = err?.code;
	const msg = err instanceof Error ? err.message : String(err);
	return code === "23505" || /unique|duplicate/i.test(msg);
}
function toProfile(row) {
	return {
		userId: row.user_id,
		username: row.username,
		displayName: row.display_name,
		photoData: row.photo_data,
		lastSeen: toMs(row.last_seen)
	};
}
function toHit(row, now) {
	const lastSeen = toMs(row.last_seen);
	return {
		userId: row.user_id,
		username: row.username,
		displayName: row.display_name,
		photoData: row.photo_data,
		lastSeen,
		online: now - lastSeen < ONLINE_MS
	};
}
async function loadProfile(sql, userId) {
	const rows = await sql`
    select user_id, username, display_name, photo_data, last_seen
    from profiles where user_id = ${userId} limit 1
  `;
	return rows[0] ? toProfile(rows[0]) : null;
}
async function requireProfile(sql, userId) {
	const profile = await loadProfile(sql, userId);
	if (!profile) throw new Error("Claim a username first");
	return profile;
}
async function isBlocked(sql, a, b) {
	return (await sql`
    select 1 as n from blocks
    where (blocker_id = ${a} and blocked_id = ${b})
       or (blocker_id = ${b} and blocked_id = ${a})
    limit 1
  `).length > 0;
}
async function membersOf(sql, conversationId) {
	return (await sql`
    select user_id from conversation_members where conversation_id = ${conversationId}
  `).map((r) => r.user_id);
}
async function ensureDm(sql, me, peerId) {
	if (me === peerId) throw new Error("Use Saved for notes to yourself");
	if (await isBlocked(sql, me, peerId)) throw new Error("You cannot message this person");
	if (!await loadProfile(sql, peerId)) throw new Error("No one with that account");
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
async function assertMember(sql, conversationId, userId) {
	const ids = await membersOf(sql, conversationId);
	if (!ids.includes(userId)) throw new Error("You are not in this chat");
	return ids;
}
async function fanout(sql, opts) {
	const payload = JSON.stringify(opts.payload);
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	for (const to of opts.memberIds) {
		if (to === opts.fromUserId) continue;
		if (await isBlocked(sql, opts.fromUserId, to)) continue;
		const id = crypto.randomUUID();
		if (opts.expiresAt) await sql`
        insert into pending_events
          (id, conversation_id, from_user_id, to_user_id, kind, payload, created_at, expires_at)
        values
          (${id}, ${opts.conversationId}, ${opts.fromUserId}, ${to}, ${opts.kind}, ${payload}, ${nowIso}, ${opts.expiresAt})
      `;
		else await sql`
        insert into pending_events
          (id, conversation_id, from_user_id, to_user_id, kind, payload, created_at)
        values
          (${id}, ${opts.conversationId}, ${opts.fromUserId}, ${to}, ${opts.kind}, ${payload}, ${nowIso})
      `;
	}
}
async function loadPeople(sql, ids, now) {
	const unique = [...new Set(ids.filter(Boolean))];
	if (unique.length === 0) return [];
	const placeholders = unique.map((_, i) => `$${i + 1}`).join(",");
	return (await sql.query(`select user_id, username, display_name, last_seen from profiles where user_id in (${placeholders})`, unique)).map((r) => toHit({
		user_id: r.user_id,
		username: r.username,
		display_name: r.display_name,
		photo_data: null,
		last_seen: r.last_seen
	}, now));
}
var getMyProfile_createServerFn_handler = createServerRpc({
	id: "a3189f67e7a0e318bea90c0c87dd68570f6485003ebff7e8c62d3681fdd78474",
	name: "getMyProfile",
	filename: "src/lib/messenger/server.ts"
}, (opts) => getMyProfile.__executeServer(opts));
var getMyProfile = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getMyProfile_createServerFn_handler, async ({ context }) => {
	return loadProfile(await getDb(), context.userId);
});
var claimProfile_createServerFn_handler = createServerRpc({
	id: "f89dbf5998bd1ebacdc943cd99fe9ee3e55c367aa528bffd66eff835265ff473",
	name: "claimProfile",
	filename: "src/lib/messenger/server.ts"
}, (opts) => claimProfile.__executeServer(opts));
var claimProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	username: usernameSchema,
	displayName: string().trim().min(1).max(40),
	photoData: string().max(MAX_AVATAR_CHARS).nullable().optional()
}).parse(input)).handler(claimProfile_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	const existing = await loadProfile(sql, context.userId);
	const photo = data.photoData === void 0 ? existing?.photoData ?? null : data.photoData;
	try {
		if (existing) await sql`
          update profiles
          set username = ${data.username},
              display_name = ${data.displayName},
              photo_data = ${photo}
          where user_id = ${context.userId}
        `;
		else await sql`
          insert into profiles (user_id, username, display_name, photo_data)
          values (${context.userId}, ${data.username}, ${data.displayName}, ${photo ?? null})
        `;
	} catch (err) {
		if (isUniqueViolation(err)) throw new Error("That username is taken");
		throw err;
	}
	const profile = await loadProfile(sql, context.userId);
	if (!profile) throw new Error("Could not save profile");
	return profile;
});
var searchUsers_createServerFn_handler = createServerRpc({
	id: "8e108dd2cc150e5c5bb46344103cd16f71d8c852d0c9c4cd1e245bf3b96c6ce6",
	name: "searchUsers",
	filename: "src/lib/messenger/server.ts"
}, (opts) => searchUsers.__executeServer(opts));
var searchUsers = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ q: string().trim().min(1).max(20) }).parse(input)).handler(searchUsers_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	await requireProfile(sql, context.userId);
	const now = Date.now();
	return (await sql`
      select p.user_id, p.username, p.display_name, p.photo_data, p.last_seen
      from profiles p
      where lower(p.username) like ${`${data.q.toLowerCase()}%`}
        and p.user_id <> ${context.userId}
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by p.username asc
      limit 8
    `).map((r) => toHit(r, now));
});
var mediaSchema = object({
	kind: _enum([
		"image",
		"file",
		"voice"
	]),
	name: string().max(180),
	mime: string().max(120),
	dataUrl: string().max(MAX_MEDIA_CHARS),
	durationMs: number().int().nonnegative().optional()
}).nullable().optional();
var sendMessage_createServerFn_handler = createServerRpc({
	id: "2748136a3810e1344109cd073c261fd1b20f37857efcab2c536086c32317efdf",
	name: "sendMessage",
	filename: "src/lib/messenger/server.ts"
}, (opts) => sendMessage.__executeServer(opts));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	conversationId: string().min(1).max(200).optional(),
	peerUserId: string().min(1).max(80).optional(),
	clientId: string().uuid(),
	body: string().max(MAX_TEXT),
	media: mediaSchema,
	createdAt: number().int()
}).parse(input)).handler(sendMessage_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	const me = await requireProfile(sql, context.userId);
	if (!data.body.trim() && !data.media) throw new Error("Write something first");
	const recent = await sql`
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
		const rows = await sql`
        select kind, title from conversations where id = ${conversationId} limit 1
      `;
		if (!rows[0]) throw new Error("Chat not found");
		kind = rows[0].kind;
		title = rows[0].title ?? "";
		await assertMember(sql, conversationId, context.userId);
	} else if (data.peerUserId) conversationId = await ensureDm(sql, context.userId, data.peerUserId);
	else if (conversationId?.startsWith("dm:")) {
		const peer = conversationId.split(":").slice(1).find((id) => id && id !== context.userId);
		if (!peer) throw new Error("Invalid chat");
		conversationId = await ensureDm(sql, context.userId, peer);
	} else throw new Error("Pick someone to message");
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
			photoData: me.photoData
		}
	};
	await fanout(sql, {
		conversationId,
		fromUserId: context.userId,
		memberIds,
		kind: "message",
		payload
	});
	return {
		conversationId,
		memberIds
	};
});
var createGroup_createServerFn_handler = createServerRpc({
	id: "e8fa6613dd254baa924a6b136e67b39d8061bf2718784a0164fa16310d142724",
	name: "createGroup",
	filename: "src/lib/messenger/server.ts"
}, (opts) => createGroup.__executeServer(opts));
var createGroup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	title: string().trim().min(1).max(40),
	memberUserIds: array(string().min(1).max(80)).max(19)
}).parse(input)).handler(createGroup_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	const me = await requireProfile(sql, context.userId);
	const memberIds = [.../* @__PURE__ */ new Set([context.userId, ...data.memberUserIds])];
	if (memberIds.length < 2) throw new Error("Add at least one other person");
	for (const id of memberIds) {
		if (id === context.userId) continue;
		if (await isBlocked(sql, context.userId, id)) throw new Error("Someone you blocked is in the list");
		if (!await loadProfile(sql, id)) throw new Error("One of those usernames is not on Vesper");
	}
	const conversationId = `g:${crypto.randomUUID()}`;
	await sql`
      insert into conversations (id, kind, title, created_by)
      values (${conversationId}, 'group', ${data.title}, ${context.userId})
    `;
	for (const id of memberIds) await sql`
        insert into conversation_members (conversation_id, user_id, role)
        values (${conversationId}, ${id}, ${id === context.userId ? "admin" : "member"})
      `;
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
			from: {
				userId: me.userId,
				username: me.username,
				displayName: me.displayName
			}
		}
	});
	return {
		conversationId,
		memberIds,
		people
	};
});
var sendReceipts_createServerFn_handler = createServerRpc({
	id: "52dbc31b755634a82563a1cf07f4362bf255ff415e1a1e7431bfe38b678e5c2b",
	name: "sendReceipts",
	filename: "src/lib/messenger/server.ts"
}, (opts) => sendReceipts.__executeServer(opts));
var sendReceipts = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	conversationId: string().min(1).max(200),
	items: array(object({
		messageId: string().min(1).max(80),
		toUserId: string().min(1).max(80)
	})).max(80)
}).parse(input)).handler(sendReceipts_createServerFn_handler, async ({ context, data }) => {
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
				status: "read"
			}
		});
	}
	return { ok: true };
});
var blockUser_createServerFn_handler = createServerRpc({
	id: "55b25fb47ec13ad61c8682dbf2a8b26de7d00e92c74cf3be7e0126a32ea442b8",
	name: "blockUser",
	filename: "src/lib/messenger/server.ts"
}, (opts) => blockUser.__executeServer(opts));
var blockUser = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ userId: string().min(1).max(80) }).parse(input)).handler(blockUser_createServerFn_handler, async ({ context, data }) => {
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
var sendCallSignal_createServerFn_handler = createServerRpc({
	id: "819b0b4efaa45b20ddb6ab25c02ee54e9b1074d10844aecfc8afad563d73ad2a",
	name: "sendCallSignal",
	filename: "src/lib/messenger/server.ts"
}, (opts) => sendCallSignal.__executeServer(opts));
var sendCallSignal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	conversationId: string().min(1).max(200),
	toUserId: string().min(1).max(80),
	callId: string().min(1).max(80),
	action: _enum([
		"invite",
		"accept",
		"reject",
		"hangup",
		"offer",
		"answer",
		"ice"
	]),
	video: boolean(),
	sdp: string().max(32768).optional(),
	ice: string().max(4096).optional()
}).parse(input)).handler(sendCallSignal_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	const me = await requireProfile(sql, context.userId);
	if (data.toUserId === context.userId) throw new Error("Cannot call yourself");
	let conversationId = data.conversationId;
	if (conversationId.startsWith("dm:")) {
		const peer = conversationId.split(":").slice(1).find((id) => id && id !== context.userId);
		if (!peer || peer !== data.toUserId) throw new Error("Invalid chat");
		conversationId = await ensureDm(sql, context.userId, peer);
	}
	if (!(await assertMember(sql, conversationId, context.userId)).includes(data.toUserId)) throw new Error("Not in this chat");
	if (await isBlocked(sql, context.userId, data.toUserId)) throw new Error("You cannot call this person");
	const expires = new Date(Date.now() + 6e4).toISOString();
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
				photoData: data.action === "invite" ? me.photoData : void 0
			}
		},
		expiresAt: expires
	});
	return { ok: true };
});
var syncInbox_createServerFn_handler = createServerRpc({
	id: "3fbebc3671122b13df43285bbe06e69128780fee6700430087c5fe5a0cc19df1",
	name: "syncInbox",
	filename: "src/lib/messenger/server.ts"
}, (opts) => syncInbox.__executeServer(opts));
var syncInbox = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	ackIds: array(string().min(1).max(80)).max(100),
	typingConversationId: string().min(1).max(200).nullable().optional()
}).parse(input)).handler(syncInbox_createServerFn_handler, async ({ context, data }) => {
	const sql = await getDb();
	const me = await loadProfile(sql, context.userId);
	if (!me) return {
		events: [],
		people: [],
		typing: [],
		now: Date.now()
	};
	if (Date.now() - me.lastSeen > 8e3) await sql`update profiles set last_seen = now() where user_id = ${context.userId}`;
	if (data.ackIds.length) {
		const placeholders = data.ackIds.map((_, i) => `$${i + 2}`).join(",");
		const acked = await sql.query(`delete from pending_events
         where to_user_id = $1 and id in (${placeholders})
         returning id, from_user_id, conversation_id, kind, payload`, [context.userId, ...data.ackIds]);
		for (const row of acked) {
			if (row.kind !== "message") continue;
			let messageId = "";
			try {
				messageId = String(JSON.parse(row.payload).id ?? "");
			} catch {
				messageId = "";
			}
			if (messageId && row.from_user_id !== context.userId) await fanout(sql, {
				conversationId: row.conversation_id,
				fromUserId: context.userId,
				memberIds: [row.from_user_id, context.userId],
				kind: "receipt",
				payload: {
					type: "receipt",
					messageId,
					conversationId: row.conversation_id,
					status: "delivered"
				}
			});
		}
	}
	if (Math.random() < .03) {
		await sql`delete from pending_events where expires_at is not null and expires_at < now()`;
		await sql`
        delete from pending_events
        where kind = 'message' and created_at < now() - interval '7 days'
      `;
	}
	if (data.typingConversationId) try {
		const members = await assertMember(sql, data.typingConversationId, context.userId);
		await sql`
          delete from pending_events
          where from_user_id = ${context.userId}
            and kind = 'typing'
            and conversation_id = ${data.typingConversationId}
        `;
		const expires = new Date(Date.now() + 4e3).toISOString();
		await fanout(sql, {
			conversationId: data.typingConversationId,
			fromUserId: context.userId,
			memberIds: members,
			kind: "typing",
			payload: {
				type: "typing",
				conversationId: data.typingConversationId
			},
			expiresAt: expires
		});
	} catch {}
	else if (data.typingConversationId === null) await sql`
        delete from pending_events
        where from_user_id = ${context.userId} and kind = 'typing'
      `;
	const rows = await sql`
      select id, conversation_id, from_user_id, kind, payload, created_at
      from pending_events
      where to_user_id = ${context.userId}
        and (expires_at is null or expires_at > now())
      order by created_at asc
      limit 50
    `;
	const events = [];
	const typing = [];
	for (const row of rows) {
		let payload = {};
		try {
			payload = JSON.parse(row.payload);
		} catch {
			payload = {};
		}
		if (row.kind === "typing") {
			typing.push({
				conversationId: row.conversation_id,
				userId: row.from_user_id
			});
			continue;
		}
		events.push({
			id: row.id,
			conversationId: row.conversation_id,
			fromUserId: row.from_user_id,
			kind: row.kind,
			payload,
			createdAt: toMs(row.created_at)
		});
	}
	const now = Date.now();
	return {
		events,
		people: (await sql`
      select p.user_id, p.username, p.display_name, p.last_seen
      from profiles p
      where p.user_id <> ${context.userId}
        and p.user_id in (
          select distinct cm2.user_id
          from conversation_members cm1
          join conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
          where cm1.user_id = ${context.userId}
        )
    `).map((r) => toHit({
			user_id: r.user_id,
			username: r.username,
			display_name: r.display_name,
			photo_data: null,
			last_seen: r.last_seen
		}, now)),
		typing,
		now
	};
});
//#endregion
export { blockUser_createServerFn_handler, claimProfile_createServerFn_handler, createGroup_createServerFn_handler, getMyProfile_createServerFn_handler, searchUsers_createServerFn_handler, sendCallSignal_createServerFn_handler, sendMessage_createServerFn_handler, sendReceipts_createServerFn_handler, syncInbox_createServerFn_handler };
