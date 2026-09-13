import { o as __toESM } from "../_runtime.mjs";
import { a as hasGateSessionMarker } from "./server-C4WtiVnI.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { C as ArrowLeft, S as Ban, _ as EllipsisVertical, a as Square, b as Bookmark, c as Search, d as PhoneOff, f as Paperclip, g as FileText, h as Image$1, l as Plus, m as MicOff, n as Video, o as Settings, p as Mic, r as VideoOff, s as Send, t as X, u as Phone, v as Check, x as Bell, y as CheckCheck } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { a as Trigger, i as Root2, n as Item2, r as Portal2, t as Content2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as TooltipTrigger, i as TooltipContent, r as Tooltip } from "./router-bAnbkjeo.mjs";
import { i as signOut } from "./client-CVqXY6bk.mjs";
import { a as USERNAME_RE } from "./types-DHZ9OTkD.mjs";
import { i as previewText, n as isNotesId, r as notesId, t as dmId } from "./ids-D_oUFC7O.mjs";
import { a as VesperMark, c as createGroup, d as sendCallSignal, f as sendMessage, g as useCurrentUserState, h as useCurrentUser, i as LoginPage, l as getMyProfile, m as syncInbox, n as Input, o as blockUser, p as sendReceipts, r as Label, s as claimProfile, t as Button, u as searchUsers } from "./use-current-user-Dz-rvAaT.mjs";
import { n as liveQuery, t as Dexie } from "../_libs/dexie.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/gate-CMInHccP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function initials(name) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}
function PersonAvatar({ name, photo, lastSeen, now, size = "md", showOnline = false }) {
	const dim = size === "sm" ? "size-9 text-[11px]" : size === "lg" ? "size-16 text-lg" : "size-11 text-sm";
	const online = showOnline && lastSeen != null && now != null && now - lastSeen < 25e3;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "relative inline-flex shrink-0",
		children: [photo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: photo,
			alt: "",
			className: cn("rounded-full object-cover bg-surface-2", dim)
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("grid place-items-center rounded-full bg-surface-2 font-medium text-accent", dim),
			children: initials(name)
		}), online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 right-0 size-2.5 rounded-full bg-online ring-2 ring-bg" }) : null]
	});
}
var VesperDB = class extends Dexie {
	conversations;
	messages;
	people;
	constructor(userId) {
		super(`vesper:${userId}`);
		this.version(1).stores({
			conversations: "id, lastAt, kind",
			messages: "id, conversationId, createdAt, [conversationId+createdAt]",
			people: "userId, username"
		});
	}
};
var cache = /* @__PURE__ */ new Map();
function getLocalDb(userId) {
	let db = cache.get(userId);
	if (!db) {
		db = new VesperDB(userId);
		cache.set(userId, db);
	}
	return db;
}
async function ensureNotes(db, userId) {
	const id = notesId(userId);
	if (await db.conversations.get(id)) return;
	await db.conversations.put({
		id,
		kind: "notes",
		title: "Saved",
		memberIds: [userId],
		lastMessage: "Private notes on this device",
		lastAt: Date.now(),
		unread: 0
	});
}
async function upsertPerson(db, person) {
	await db.people.put(person);
}
async function bumpConversation(db, patch) {
	const prev = await db.conversations.get(patch.id);
	const unread = patch.resetUnread ? 0 : (prev?.unread ?? 0) + (patch.unreadDelta ?? 0);
	await db.conversations.put({
		id: patch.id,
		kind: patch.kind,
		title: patch.title || prev?.title || "Chat",
		memberIds: patch.memberIds.length ? patch.memberIds : prev?.memberIds ?? [],
		lastMessage: patch.lastMessage,
		lastAt: patch.lastAt,
		unread
	});
}
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
var CallEngine = class {
	pc = null;
	local = null;
	pendingIce = [];
	remoteSet = false;
	send;
	onChange;
	call;
	constructor(call, send, onChange) {
		this.call = call;
		this.send = send;
		this.onChange = onChange;
	}
	async startMedia() {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true
			},
			video: this.call.video ? {
				facingMode: "user",
				width: { ideal: 960 }
			} : false
		});
		this.local = stream;
		this.call.localStream = stream;
		return stream;
	}
	ensurePc() {
		if (this.pc) return this.pc;
		const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
		this.pc = pc;
		pc.onicecandidate = (e) => {
			if (!e.candidate) return;
			this.send({
				action: "ice",
				callId: this.call.id,
				video: this.call.video,
				ice: JSON.stringify(e.candidate.toJSON())
			});
		};
		pc.ontrack = (e) => {
			const stream = e.streams[0] ?? new MediaStream([e.track]);
			this.call.remoteStream = stream;
			this.call.status = "live";
			this.onChange(stream);
		};
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "connected") {
				this.call.status = "live";
				this.onChange(this.call.remoteStream);
			}
		};
		this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local));
		return pc;
	}
	async makeOffer() {
		const pc = this.ensurePc();
		this.call.status = "connecting";
		const offer = await pc.createOffer({
			offerToReceiveAudio: true,
			offerToReceiveVideo: this.call.video
		});
		await pc.setLocalDescription(offer);
		this.send({
			action: "offer",
			callId: this.call.id,
			video: this.call.video,
			sdp: offer.sdp ?? ""
		});
	}
	async takeOffer(sdp) {
		const pc = this.ensurePc();
		await pc.setRemoteDescription({
			type: "offer",
			sdp
		});
		this.remoteSet = true;
		await this.flushIce();
		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);
		this.call.status = "connecting";
		this.send({
			action: "answer",
			callId: this.call.id,
			video: this.call.video,
			sdp: answer.sdp ?? ""
		});
	}
	async takeAnswer(sdp) {
		await this.ensurePc().setRemoteDescription({
			type: "answer",
			sdp
		});
		this.remoteSet = true;
		await this.flushIce();
		this.call.status = "live";
	}
	async takeIce(raw) {
		let init;
		try {
			init = JSON.parse(raw);
		} catch {
			return;
		}
		if (!this.remoteSet || !this.pc) {
			this.pendingIce.push(init);
			return;
		}
		try {
			await this.pc.addIceCandidate(init);
		} catch {}
	}
	async flushIce() {
		if (!this.pc) return;
		const pending = this.pendingIce.splice(0);
		for (const c of pending) try {
			await this.pc.addIceCandidate(c);
		} catch {}
	}
	setMuted(muted) {
		this.call.muted = muted;
		this.local?.getAudioTracks().forEach((t) => {
			t.enabled = !muted;
		});
	}
	setCameraOff(off) {
		this.call.cameraOff = off;
		this.local?.getVideoTracks().forEach((t) => {
			t.enabled = !off;
		});
	}
	close() {
		this.local?.getTracks().forEach((t) => t.stop());
		this.pc?.close();
		this.pc = null;
		this.local = null;
		this.call.localStream = null;
		this.call.remoteStream = null;
		this.onChange(null);
	}
};
function startRing() {
	if (typeof window === "undefined" || typeof AudioContext === "undefined") return () => {};
	const ctx = new AudioContext();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "sine";
	osc.frequency.value = 520;
	gain.gain.value = .04;
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start();
	const pulse = window.setInterval(() => {
		gain.gain.setTargetAtTime(gain.gain.value > .02 ? .004 : .045, ctx.currentTime, .05);
	}, 420);
	return () => {
		window.clearInterval(pulse);
		try {
			osc.stop();
			ctx.close();
		} catch {}
	};
}
var PREF_KEY = "vesper:alerts";
function alertsEnabled() {
	try {
		return localStorage.getItem(PREF_KEY) !== "off";
	} catch {
		return true;
	}
}
function setAlertsEnabled(on) {
	try {
		localStorage.setItem(PREF_KEY, on ? "on" : "off");
	} catch {}
}
async function ensureNotifyPermission() {
	if (typeof Notification === "undefined") return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	try {
		return await Notification.requestPermission() === "granted";
	} catch {
		return false;
	}
}
function pushBrowserAlert(title, body, tag) {
	if (!alertsEnabled()) return;
	if (typeof Notification === "undefined") return;
	if (Notification.permission !== "granted") return;
	if (typeof document !== "undefined" && !document.hidden) return;
	try {
		const n = new Notification(title, {
			body,
			tag
		});
		n.onclick = () => {
			window.focus();
			n.close();
		};
	} catch {}
}
function setUnreadTitle(count) {
	if (typeof document === "undefined") return;
	document.title = count > 0 ? `(${count}) Vesper` : "Vesper";
}
var MessengerContext = (0, import_react.createContext)(null);
function errMessage(err) {
	if (err instanceof Error && err.message) return err.message;
	return "Something went wrong";
}
function MessengerProvider({ user, profile: initialProfile, selectedId, onSelectedId, children }) {
	const db = (0, import_react.useMemo)(() => getLocalDb(user.id), [user.id]);
	const [profile, setProfile] = (0, import_react.useState)(initialProfile);
	const [conversations, setConversations] = (0, import_react.useState)([]);
	const [people, setPeople] = (0, import_react.useState)({});
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [typing, setTypingMap] = (0, import_react.useState)({});
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [call, setCall] = (0, import_react.useState)(null);
	const [alertsOn, setAlertsOnState] = (0, import_react.useState)(() => alertsEnabled());
	const [alerts, setAlerts] = (0, import_react.useState)([]);
	const selectedRef = (0, import_react.useRef)(selectedId);
	const typingRef = (0, import_react.useRef)(false);
	const lastTypingSent = (0, import_react.useRef)(false);
	const lastTypingAt = (0, import_react.useRef)(0);
	const ackQueue = (0, import_react.useRef)([]);
	const engineRef = (0, import_react.useRef)(null);
	const stopRing = (0, import_react.useRef)(null);
	const callRef = (0, import_react.useRef)(null);
	const inCallRef = (0, import_react.useRef)(false);
	const receiptSent = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const peopleRef = (0, import_react.useRef)(people);
	peopleRef.current = people;
	selectedRef.current = selectedId;
	callRef.current = call;
	inCallRef.current = Boolean(call);
	(0, import_react.useEffect)(() => {
		ensureNotes(db, user.id);
		db.people.toArray().then((rows) => {
			const map = {};
			for (const row of rows) map[row.userId] = row;
			setPeople((prev) => ({
				...map,
				...prev
			}));
		});
	}, [db, user.id]);
	(0, import_react.useEffect)(() => {
		const sub = liveQuery(() => db.conversations.orderBy("lastAt").reverse().toArray()).subscribe({
			next: setConversations,
			error: () => {}
		});
		return () => sub.unsubscribe();
	}, [db]);
	(0, import_react.useEffect)(() => {
		if (!selectedId) {
			setMessages([]);
			return;
		}
		const sub = liveQuery(() => db.messages.where("conversationId").equals(selectedId).sortBy("createdAt")).subscribe({
			next: setMessages,
			error: () => {}
		});
		return () => sub.unsubscribe();
	}, [db, selectedId]);
	(0, import_react.useEffect)(() => {
		if (!selectedId) return;
		db.conversations.update(selectedId, { unread: 0 });
	}, [db, selectedId]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1e4);
		return () => window.clearInterval(id);
	}, []);
	const mergePeople = (0, import_react.useCallback)((hits) => {
		if (hits.length === 0) return;
		setPeople((prev) => {
			let changed = false;
			const next = { ...prev };
			const persist = [];
			const t = Date.now();
			for (const hit of hits) {
				const old = next[hit.userId];
				const lastSeen = hit.lastSeen;
				const photo = hit.photoData || old?.photoData || null;
				const displayName = hit.displayName || old?.displayName || hit.username;
				const username = hit.username || old?.username || "";
				const wasOnline = old?.lastSeen != null && t - old.lastSeen < 25e3;
				const isOnline = lastSeen != null && t - lastSeen < 25e3;
				const identityChanged = !old || old.username !== username || old.displayName !== displayName || hit.photoData && hit.photoData !== old.photoData;
				if (!identityChanged && !(wasOnline !== isOnline) && old) continue;
				const person = {
					userId: hit.userId,
					username,
					displayName,
					photoData: photo,
					lastSeen
				};
				next[hit.userId] = person;
				changed = true;
				if (identityChanged) persist.push(person);
			}
			if (persist.length) (async () => {
				for (const p of persist) await upsertPerson(db, p);
			})();
			return changed ? next : prev;
		});
	}, [db]);
	const addAlert = (0, import_react.useCallback)((title, body, conversationId) => {
		const item = {
			id: crypto.randomUUID(),
			title,
			body,
			conversationId,
			at: Date.now(),
			read: false
		};
		setAlerts((prev) => [item, ...prev].slice(0, 30));
		if (alertsEnabled()) {
			pushBrowserAlert(title, body, conversationId || item.id);
			toast(title, { description: body });
		}
	}, []);
	const signal = (0, import_react.useCallback)((toUserId, conversationId, payload) => {
		sendCallSignal({ data: {
			conversationId,
			toUserId,
			callId: payload.callId,
			action: payload.action,
			video: payload.video,
			sdp: payload.sdp,
			ice: payload.ice
		} }).catch(() => {});
	}, []);
	const hangup = (0, import_react.useCallback)(() => {
		stopRing.current?.();
		stopRing.current = null;
		const engine = engineRef.current;
		const current = callRef.current;
		engineRef.current = null;
		if (engine && current) {
			signal(current.peerId, current.conversationId, {
				action: "hangup",
				callId: current.id,
				video: current.video
			});
			engine.close();
		}
		setCall(null);
	}, [signal]);
	const attachEngine = (0, import_react.useCallback)((next) => {
		const engine = new CallEngine(next, (sig) => {
			signal(next.peerId, next.conversationId, sig);
		}, (stream) => {
			setCall((c) => c ? {
				...c,
				remoteStream: stream,
				status: stream ? "live" : c.status
			} : c);
		});
		engineRef.current = engine;
		return engine;
	}, [signal]);
	const startCall = (0, import_react.useCallback)(async (peerId, conversationId, video) => {
		if (engineRef.current) hangup();
		const id = crypto.randomUUID();
		const engine = attachEngine({
			id,
			peerId,
			conversationId,
			video,
			role: "outgoing",
			status: "ringing",
			muted: false,
			cameraOff: false,
			localStream: null,
			remoteStream: null
		});
		try {
			await engine.startMedia();
			setCall({ ...engine.call });
			signal(peerId, conversationId, {
				action: "invite",
				callId: id,
				video
			});
			stopRing.current = startRing();
		} catch {
			engine.close();
			engineRef.current = null;
			toast.error("Microphone or camera permission is needed to call.");
		}
	}, [
		attachEngine,
		hangup,
		signal
	]);
	const acceptCall = (0, import_react.useCallback)(async () => {
		const current = callRef.current;
		if (!current || current.role !== "incoming") return;
		stopRing.current?.();
		stopRing.current = null;
		const engine = engineRef.current ?? attachEngine(current);
		try {
			await engine.startMedia();
			setCall({
				...engine.call,
				status: "connecting"
			});
			signal(current.peerId, current.conversationId, {
				action: "accept",
				callId: current.id,
				video: current.video
			});
		} catch {
			toast.error("Microphone or camera permission is needed to answer.");
			hangup();
		}
	}, [
		attachEngine,
		hangup,
		signal
	]);
	const rejectCall = (0, import_react.useCallback)(() => {
		const current = callRef.current;
		stopRing.current?.();
		stopRing.current = null;
		if (current) signal(current.peerId, current.conversationId, {
			action: "reject",
			callId: current.id,
			video: current.video
		});
		engineRef.current?.close();
		engineRef.current = null;
		setCall(null);
	}, [signal]);
	const toggleMute = (0, import_react.useCallback)(() => {
		const engine = engineRef.current;
		if (!engine) return;
		engine.setMuted(!engine.call.muted);
		setCall({ ...engine.call });
	}, []);
	const toggleCamera = (0, import_react.useCallback)(() => {
		const engine = engineRef.current;
		if (!engine) return;
		engine.setCameraOff(!engine.call.cameraOff);
		setCall({ ...engine.call });
	}, []);
	(0, import_react.useEffect)(() => {
		let stopped = false;
		let timer = null;
		const tick = async () => {
			if (stopped) return;
			try {
				const acks = ackQueue.current.splice(0, 80);
				const typingOn = typingRef.current;
				let typingConversationId;
				if (typingOn) {
					if (!lastTypingSent.current || Date.now() - lastTypingAt.current > 1800) {
						typingConversationId = selectedRef.current;
						lastTypingSent.current = true;
						lastTypingAt.current = Date.now();
					}
				} else if (lastTypingSent.current) {
					typingConversationId = null;
					lastTypingSent.current = false;
				}
				const snap = await syncInbox({ data: {
					ackIds: acks,
					typingConversationId
				} });
				if (stopped) return;
				mergePeople(snap.people);
				const typingNext = {};
				for (const t of snap.typing) (typingNext[t.conversationId] ??= []).push(t.userId);
				setTypingMap(typingNext);
				for (const ev of snap.events) {
					ackQueue.current.push(ev.id);
					if (ev.kind === "message") {
						const body = String(ev.payload.body ?? "");
						const media = ev.payload.media ?? null;
						const createdAt = Number(ev.payload.createdAt ?? ev.createdAt);
						const id = String(ev.payload.id ?? ev.id);
						const memberIds = ev.payload.memberIds ?? [];
						const kind = ev.payload.conversationKind ?? "dm";
						const title = String(ev.payload.conversationTitle ?? "");
						if (!await db.messages.get(id)) {
							await db.messages.put({
								id,
								conversationId: ev.conversationId,
								fromUserId: ev.fromUserId,
								body,
								createdAt,
								status: "delivered",
								media
							});
							if (!(selectedRef.current === ev.conversationId)) {
								const name = peopleRef.current[ev.fromUserId]?.displayName || ev.payload.from?.displayName || "New message";
								addAlert(name, previewText(body, media?.kind), ev.conversationId);
							}
						}
						const viewing = selectedRef.current === ev.conversationId;
						await bumpConversation(db, {
							id: ev.conversationId,
							kind,
							title: title || (kind === "group" ? "Group" : "Chat"),
							memberIds,
							lastMessage: previewText(body, media?.kind),
							lastAt: createdAt,
							unreadDelta: viewing ? 0 : 1,
							resetUnread: viewing
						});
						if (ev.payload.from) mergePeople([{
							userId: ev.payload.from.userId,
							username: ev.payload.from.username,
							displayName: ev.payload.from.displayName,
							photoData: ev.payload.from.photoData ?? null,
							lastSeen: Date.now(),
							online: true
						}]);
					} else if (ev.kind === "invite") {
						const memberIds = ev.payload.memberIds ?? [];
						const title = String(ev.payload.conversationTitle ?? "Group");
						await bumpConversation(db, {
							id: ev.conversationId,
							kind: "group",
							title,
							memberIds,
							lastMessage: "You were added",
							lastAt: ev.createdAt || Date.now()
						});
					} else if (ev.kind === "receipt") {
						const messageId = String(ev.payload.messageId ?? "");
						const status = ev.payload.status === "read" ? "read" : "delivered";
						if (messageId) {
							const msg = await db.messages.get(messageId);
							if (msg && msg.fromUserId === user.id) {
								const rank = {
									sending: 0,
									sent: 1,
									delivered: 2,
									read: 3,
									failed: -1
								};
								if (rank[status] > rank[msg.status]) await db.messages.update(messageId, { status });
							}
						}
					} else if (ev.kind === "call") {
						const action = String(ev.payload.action ?? "");
						const callId = String(ev.payload.callId ?? "");
						const video = Boolean(ev.payload.video);
						const current = callRef.current;
						if (action === "invite") {
							if (current) signal(ev.fromUserId, ev.conversationId, {
								action: "reject",
								callId,
								video
							});
							else {
								const incoming = {
									id: callId,
									peerId: ev.fromUserId,
									conversationId: ev.conversationId,
									video,
									role: "incoming",
									status: "ringing",
									muted: false,
									cameraOff: false,
									localStream: null,
									remoteStream: null
								};
								attachEngine(incoming);
								setCall(incoming);
								stopRing.current = startRing();
								const name = ev.payload.from?.displayName || peopleRef.current[ev.fromUserId]?.displayName || "Incoming call";
								addAlert(name, video ? "Video call" : "Voice call", ev.conversationId);
								if (ev.payload.from) mergePeople([{
									userId: ev.payload.from.userId,
									username: ev.payload.from.username,
									displayName: ev.payload.from.displayName,
									photoData: ev.payload.from.photoData ?? null,
									lastSeen: Date.now(),
									online: true
								}]);
							}
						} else if (current && current.id === callId) {
							const engine = engineRef.current;
							if (action === "accept" && current.role === "outgoing") {
								stopRing.current?.();
								stopRing.current = null;
								engine?.makeOffer();
								setCall((c) => c ? {
									...c,
									status: "connecting"
								} : c);
							} else if (action === "offer" && ev.payload.sdp) engine?.takeOffer(ev.payload.sdp);
							else if (action === "answer" && ev.payload.sdp) engine?.takeAnswer(ev.payload.sdp);
							else if (action === "ice" && ev.payload.ice) engine?.takeIce(ev.payload.ice);
							else if (action === "reject" || action === "hangup") {
								stopRing.current?.();
								stopRing.current = null;
								engine?.close();
								engineRef.current = null;
								setCall(null);
								if (action === "reject") toast("Call declined");
							}
						}
					}
				}
			} catch {}
			const hidden = typeof document !== "undefined" && document.hidden;
			const delay = inCallRef.current ? 280 : hidden ? 3e3 : 700;
			timer = setTimeout(() => void tick(), delay);
		};
		tick();
		return () => {
			stopped = true;
			if (timer) clearTimeout(timer);
		};
	}, [
		addAlert,
		attachEngine,
		db,
		mergePeople,
		signal,
		user.id
	]);
	(0, import_react.useEffect)(() => {
		if (!selectedId || isNotesId(selectedId)) return;
		const unreadFromOthers = messages.filter((m) => m.fromUserId !== user.id && !receiptSent.current.has(m.id));
		if (unreadFromOthers.length === 0) return;
		for (const m of unreadFromOthers) receiptSent.current.add(m.id);
		const items = unreadFromOthers.map((m) => ({
			messageId: m.id,
			toUserId: m.fromUserId
		}));
		const t = setTimeout(() => {
			sendReceipts({ data: {
				conversationId: selectedId,
				items
			} }).catch(() => {});
		}, 250);
		return () => clearTimeout(t);
	}, [
		messages,
		selectedId,
		user.id
	]);
	(0, import_react.useEffect)(() => {
		setUnreadTitle(conversations.reduce((n, c) => n + (c.unread || 0), 0));
		return () => setUnreadTitle(0);
	}, [conversations]);
	(0, import_react.useEffect)(() => () => {
		stopRing.current?.();
		engineRef.current?.close();
	}, []);
	const refreshProfile = (0, import_react.useCallback)(async (patch) => {
		const next = await claimProfile({ data: patch });
		setProfile(next);
	}, []);
	const searchUsers$1 = (0, import_react.useCallback)(async (q) => {
		return searchUsers({ data: { q } });
	}, []);
	const openDm = (0, import_react.useCallback)(async (peer) => {
		const id = dmId(user.id, peer.userId);
		await upsertPerson(db, {
			userId: peer.userId,
			username: peer.username,
			displayName: peer.displayName,
			photoData: peer.photoData,
			lastSeen: peer.lastSeen
		});
		mergePeople([peer]);
		if (!await db.conversations.get(id)) await db.conversations.put({
			id,
			kind: "dm",
			title: peer.displayName,
			memberIds: [user.id, peer.userId],
			lastMessage: "New conversation",
			lastAt: Date.now(),
			unread: 0
		});
		return id;
	}, [
		db,
		mergePeople,
		user.id
	]);
	const createGroup$1 = (0, import_react.useCallback)(async (title, members) => {
		const result = await createGroup({ data: {
			title,
			memberUserIds: members.map((m) => m.userId)
		} });
		mergePeople(result.people);
		await db.conversations.put({
			id: result.conversationId,
			kind: "group",
			title,
			memberIds: result.memberIds,
			lastMessage: "Group created",
			lastAt: Date.now(),
			unread: 0
		});
		return result.conversationId;
	}, [db, mergePeople]);
	const send = (0, import_react.useCallback)(async (opts) => {
		const conversationId = selectedRef.current;
		if (!conversationId) return;
		const body = opts.body.trim();
		const media = opts.media ?? null;
		if (!body && !media) return;
		const id = crypto.randomUUID();
		const createdAt = Date.now();
		const conv = await db.conversations.get(conversationId);
		await db.messages.put({
			id,
			conversationId,
			fromUserId: user.id,
			body,
			createdAt,
			status: "sending",
			media
		});
		await bumpConversation(db, {
			id: conversationId,
			kind: conv?.kind ?? (isNotesId(conversationId) ? "notes" : "dm"),
			title: conv?.title ?? "Chat",
			memberIds: conv?.memberIds ?? [user.id],
			lastMessage: previewText(body, media?.kind),
			lastAt: createdAt,
			resetUnread: true
		});
		if (isNotesId(conversationId)) {
			await db.messages.update(id, { status: "read" });
			return;
		}
		try {
			const peerUserId = (conv?.memberIds ?? []).find((m) => m !== user.id);
			await sendMessage({ data: {
				conversationId,
				peerUserId,
				clientId: id,
				body,
				media,
				createdAt
			} });
			await db.messages.update(id, { status: "sent" });
		} catch (err) {
			await db.messages.update(id, { status: "failed" });
			toast.error(errMessage(err));
		}
	}, [db, user.id]);
	const setTyping = (0, import_react.useCallback)((on) => {
		typingRef.current = on;
	}, []);
	const block = (0, import_react.useCallback)(async (userId) => {
		await blockUser({ data: { userId } });
		toast.success("Blocked. They will not be able to write to you.");
	}, []);
	const setAlertsOn = (0, import_react.useCallback)((on) => {
		setAlertsEnabled(on);
		setAlertsOnState(on);
		if (on) ensureNotifyPermission();
	}, []);
	const enableAlerts = (0, import_react.useCallback)(async () => {
		const ok = await ensureNotifyPermission();
		setAlertsEnabled(true);
		setAlertsOnState(true);
		if (!ok) toast.error("Alerts are blocked in the browser settings.");
	}, []);
	const markAlertsRead = (0, import_react.useCallback)(() => {
		setAlerts((prev) => prev.map((a) => ({
			...a,
			read: true
		})));
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		user,
		profile,
		db,
		conversations,
		people,
		typing,
		now,
		selectedId,
		setSelectedId: onSelectedId,
		messages,
		refreshProfile,
		searchUsers: searchUsers$1,
		openDm,
		createGroup: createGroup$1,
		send,
		setTyping,
		block,
		call,
		startCall,
		acceptCall,
		rejectCall,
		hangup,
		toggleMute,
		toggleCamera,
		alertsEnabled: alertsOn,
		setAlertsOn,
		enableAlerts,
		alerts,
		markAlertsRead
	}), [
		user,
		profile,
		db,
		conversations,
		people,
		typing,
		now,
		selectedId,
		onSelectedId,
		messages,
		refreshProfile,
		searchUsers$1,
		openDm,
		createGroup$1,
		send,
		setTyping,
		block,
		call,
		startCall,
		acceptCall,
		rejectCall,
		hangup,
		toggleMute,
		toggleCamera,
		alertsOn,
		setAlertsOn,
		enableAlerts,
		alerts,
		markAlertsRead
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessengerContext.Provider, {
		value,
		children
	});
}
function useMessenger() {
	const ctx = (0, import_react.useContext)(MessengerContext);
	if (!ctx) throw new Error("useMessenger must be used within MessengerProvider");
	return ctx;
}
function VideoTag({ stream, muted, className }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (ref.current) ref.current.srcObject = stream;
	}, [stream]);
	if (!stream) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		ref,
		autoPlay: true,
		playsInline: true,
		muted,
		className
	});
}
function CallOverlay() {
	const { call, people, now, acceptCall, rejectCall, hangup, toggleMute, toggleCamera } = useMessenger();
	if (!call) return null;
	const peer = people[call.peerId];
	const name = peer?.displayName || "Call";
	const ringing = call.status === "ringing";
	const incoming = call.role === "incoming" && ringing;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex flex-col bg-bg text-fg",
		children: [
			call.video && call.remoteStream ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoTag, {
				stream: call.remoteStream,
				className: "absolute inset-0 size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-surface" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-bg/40" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
					name,
					photo: peer?.photoData,
					lastSeen: peer?.lastSeen,
					now,
					size: "lg",
					showOnline: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-3xl font-medium tracking-tight",
					children: name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: incoming ? call.video ? "Incoming video call" : "Incoming voice call" : call.status === "live" ? call.video ? "Video" : "Voice" : call.status === "connecting" ? "Connecting…" : "Calling…"
				})] })]
			}),
			call.video && call.localStream ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoTag, {
				stream: call.localStream,
				muted: true,
				className: "absolute bottom-28 right-4 z-10 h-36 w-28 rounded-lg border border-border object-cover shadow-panel"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative z-10 flex items-center justify-center gap-3 px-6 pb-10",
				children: incoming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "lg",
					variant: "danger",
					onClick: rejectCall,
					className: "rounded-full px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-4" }), "Decline"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "lg",
					onClick: () => void acceptCall(),
					className: "rounded-full px-6",
					children: [call.video ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" }), "Accept"]
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: call.muted ? "danger" : "secondary",
						className: "rounded-full",
						onClick: toggleMute,
						"aria-label": call.muted ? "Unmute" : "Mute",
						children: call.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {})
					}),
					call.video ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: call.cameraOff ? "danger" : "secondary",
						className: "rounded-full",
						onClick: toggleCamera,
						"aria-label": call.cameraOff ? "Camera on" : "Camera off",
						children: call.cameraOff ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoOff, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "lg",
						variant: "danger",
						className: "rounded-full px-6",
						onClick: hangup,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-4" }), "End"]
					})
				] })
			})
		]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		sideOffset,
		className: cn("z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-panel", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	}) });
}
function DropdownMenuItem({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		className: cn("flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-fg outline-none", "focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-40", inset && "pl-8", className),
		...props
	});
}
function lastSeenLabel(lastSeen, now) {
	if (lastSeen == null) return "";
	const delta = now - lastSeen;
	if (delta < 25e3) return "Online";
	const min = Math.round(delta / 6e4);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	return new Date(lastSeen).toLocaleDateString();
}
function alertWhen(at, now) {
	const delta = now - at;
	if (delta < 6e4) return "Just now";
	const min = Math.round(delta / 6e4);
	if (min < 60) return `${min}m`;
	return new Date(at).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function ChatList({ onOpenProfile, onNewChat }) {
	const { conversations, people, profile, selectedId, setSelectedId, now, alerts, markAlertsRead, enableAlerts, alertsEnabled } = useMessenger();
	const [q, setQ] = (0, import_react.useState)("");
	const [perm, setPerm] = (0, import_react.useState)("none");
	const unreadAlerts = alerts.filter((a) => !a.read).length;
	(0, import_react.useEffect)(() => {
		if (typeof Notification === "undefined") return;
		setPerm(Notification.permission);
	}, [alertsEnabled, alerts.length]);
	const filtered = (0, import_react.useMemo)(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) return conversations;
		return conversations.filter((c) => {
			if (c.title.toLowerCase().includes(needle)) return true;
			if (c.lastMessage.toLowerCase().includes(needle)) return true;
			return c.memberIds.some((id) => {
				const p = people[id];
				return p && (p.username.includes(needle) || p.displayName.toLowerCase().includes(needle));
			});
		});
	}, [
		conversations,
		people,
		q
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full min-h-0 flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-2 px-4 pb-2 pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VesperMark, { className: "size-7" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl font-medium leading-none tracking-tight",
							children: "Vesper"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 truncate text-xs text-muted",
							children: ["@", profile.username]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						onClick: onNewChat,
						"aria-label": "New chat",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, {
						onOpenChange: (open) => {
							if (open) markAlertsRead();
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "Alerts",
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {}), unreadAlerts > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-1 top-1 size-2 rounded-full bg-accent" }) : null]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "end",
							className: "w-80 p-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between border-b border-border px-3 py-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-medium",
										children: "Alerts"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: alertsEnabled ? "On" : "Off"
									})]
								}),
								alertsEnabled && perm === "default" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "w-full border-b border-border px-3 py-2 text-left text-xs text-muted hover:bg-surface-2",
									onClick: () => void enableAlerts(),
									children: "Allow desktop notifications"
								}) : null,
								perm === "denied" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "border-b border-border px-3 py-2 text-xs text-muted",
									children: "Desktop notifications are blocked in this browser."
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "vesper-scroll max-h-80 overflow-y-auto",
									children: alerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										className: "px-3 py-8 text-center text-sm text-muted",
										children: "No alerts yet"
									}) : alerts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surface-2",
										onClick: () => {
											if (a.conversationId) setSelectedId(a.conversationId);
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-baseline justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate text-sm font-medium text-fg",
												children: a.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-xs tabular-nums text-faint",
												children: alertWhen(a.at, now)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate text-xs text-muted",
											children: a.body
										})]
									}) }, a.id))
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						onClick: onOpenProfile,
						"aria-label": "Profile",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-3 pb-3 pt-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search chats",
						className: "h-10 pl-9"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "vesper-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4",
				children: [filtered.map((c) => {
					const other = c.memberIds.find((id) => id !== profile.userId);
					const person = other ? people[other] : null;
					const title = c.kind === "group" ? c.title : c.kind === "notes" ? "Saved" : person?.displayName ?? c.title;
					const photo = c.kind === "dm" ? person?.photoData : null;
					const active = selectedId === c.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSelectedId(c.id),
						className: cn("flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-[background-color] duration-150", active ? "bg-surface-2" : "hover:bg-surface"),
						children: [c.kind === "notes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid size-11 place-items-center rounded-full bg-surface-2 text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "size-4" })
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
							name: title,
							photo,
							lastSeen: person?.lastSeen,
							now,
							showOnline: c.kind === "dm"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-baseline justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-sm font-medium text-fg",
									children: title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-xs tabular-nums text-faint",
									children: c.lastAt ? new Date(c.lastAt).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit"
									}) : ""
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-0.5 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-xs text-muted",
									children: c.lastMessage
								}), c.unread > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg",
									children: c.unread > 9 ? "9+" : c.unread
								}) : c.kind === "dm" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto shrink-0 text-xs text-faint",
									children: lastSeenLabel(person?.lastSeen, now)
								}) : null]
							})]
						})]
					}) }, c.id);
				}), filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "px-3 py-10 text-center text-sm text-muted",
					children: q.trim() ? "No matching chats" : "No conversations yet"
				}) : null]
			})
		]
	});
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-50 bg-bg/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	});
}
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed left-1/2 top-1/2 z-50 w-[min(100%-1.5rem,32rem)] -translate-x-1/2 -translate-y-1/2", "rounded-xl border border-border bg-surface p-5 shadow-panel", "data-[state=open]:animate-in data-[state=closed]:animate-out", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute right-3 top-3 rounded-sm p-2 text-muted hover:bg-surface-2 hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-4 space-y-1 pr-8", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-xl font-medium tracking-tight text-fg", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-muted", className),
		...props
	});
}
function NewChatDialog({ open, onOpenChange }) {
	const { searchUsers, openDm, createGroup, now, setSelectedId } = useMessenger();
	const [tab, setTab] = (0, import_react.useState)("dm");
	const [q, setQ] = (0, import_react.useState)("");
	const [hits, setHits] = (0, import_react.useState)([]);
	const [picked, setPicked] = (0, import_react.useState)([]);
	const [title, setTitle] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const t = setTimeout(() => {
			if (!q.trim()) {
				setHits([]);
				return;
			}
			searchUsers(q.trim()).then(setHits).catch(() => setHits([]));
		}, 180);
		return () => clearTimeout(t);
	}, [
		q,
		open,
		searchUsers
	]);
	(0, import_react.useEffect)(() => {
		if (!open) {
			setQ("");
			setHits([]);
			setPicked([]);
			setTitle("");
			setTab("dm");
		}
	}, [open]);
	async function pick(hit) {
		if (tab === "dm") {
			setBusy(true);
			try {
				const id = await openDm(hit);
				setSelectedId(id);
				onOpenChange(false);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Could not start chat");
			} finally {
				setBusy(false);
			}
			return;
		}
		setPicked((prev) => prev.some((p) => p.userId === hit.userId) ? prev : [...prev, hit]);
		setQ("");
		setHits([]);
	}
	async function makeGroup() {
		if (!title.trim() || picked.length === 0) return;
		setBusy(true);
		try {
			const id = await createGroup(title.trim(), picked);
			setSelectedId(id);
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not create group");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New conversation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Find someone by username, or start a group." })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1",
				children: ["dm", "group"].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab(t),
					className: cn("h-9 rounded-sm text-sm font-medium", tab === t ? "bg-surface-2 text-fg" : "text-muted"),
					children: t === "dm" ? "Direct" : "Group"
				}, t))
			}),
			tab === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: title,
				onChange: (e) => setTitle(e.target.value),
				placeholder: "Group name",
				className: "mb-2"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: q,
				onChange: (e) => setQ(e.target.value),
				placeholder: "Search username",
				autoFocus: true
			}),
			tab === "group" && picked.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex flex-wrap gap-1.5",
				children: picked.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg",
					onClick: () => setPicked((prev) => prev.filter((x) => x.userId !== p.userId)),
					children: ["@", p.username]
				}, p.userId))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "vesper-scroll mt-3 max-h-64 space-y-1 overflow-y-auto",
				children: [hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: busy,
					onClick: () => void pick(hit),
					className: "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
						name: hit.displayName,
						photo: hit.photoData,
						lastSeen: hit.lastSeen,
						now,
						showOnline: true,
						size: "sm"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-sm font-medium text-fg",
							children: hit.displayName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block truncate text-xs text-muted",
							children: ["@", hit.username]
						})]
					})]
				}) }, hit.userId)), q.trim() && hits.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "px-2 py-6 text-center text-sm text-muted",
					children: "No one with that username"
				}) : null]
			}),
			tab === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-3 w-full",
				disabled: busy || !title.trim() || picked.length === 0,
				onClick: () => void makeGroup(),
				children: "Create group"
			}) : null
		] })
	});
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function readAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read file"));
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.readAsDataURL(file);
	});
}
function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error("Could not load image"));
		img.src = url;
	});
}
async function resizeImageDataUrl(dataUrl, maxEdge, quality = .84) {
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
async function fileToMedia(file) {
	const mime = file.type || "application/octet-stream";
	const kind = mime.startsWith("image/") ? "image" : "file";
	let dataUrl = await readAsDataUrl(file);
	if (kind === "image") dataUrl = await resizeImageDataUrl(dataUrl, 1280, .82);
	if (dataUrl.length > 14e5) throw new Error("That file is too large to send (about 1 MB max).");
	return {
		kind,
		name: file.name || "file",
		mime,
		dataUrl
	};
}
async function blobToVoice(blob, durationMs) {
	const dataUrl = await readAsDataUrl(blob);
	if (dataUrl.length > 14e5) throw new Error("That voice note is too long. Try a shorter take.");
	return {
		kind: "voice",
		name: "voice-note.webm",
		mime: blob.type || "audio/webm",
		dataUrl,
		durationMs
	};
}
async function fileToAvatar(file) {
	if (!file.type.startsWith("image/")) throw new Error("Choose a photo.");
	const dataUrl = await resizeImageDataUrl(await readAsDataUrl(file), 320, .8);
	if (dataUrl.length > 22e4) throw new Error("Photo is still too large. Try another.");
	return dataUrl;
}
function formatDuration(ms) {
	const s = Math.max(0, Math.round(ms / 1e3));
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function ProfilePanel({ className }) {
	const { profile, refreshProfile, alertsEnabled, setAlertsOn, enableAlerts } = useMessenger();
	const [username, setUsername] = (0, import_react.useState)(profile.username);
	const [displayName, setDisplayName] = (0, import_react.useState)(profile.displayName);
	const [photo, setPhoto] = (0, import_react.useState)(profile.photoData);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function onPhoto(file) {
		if (!file) return;
		try {
			setPhoto(await fileToAvatar(file));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not use that photo");
		}
	}
	async function onSubmit(e) {
		e.preventDefault();
		const handle = username.trim().toLowerCase();
		if (!USERNAME_RE.test(handle)) {
			toast.error("Username must start with a letter, 3–20 characters.");
			return;
		}
		setBusy(true);
		try {
			await refreshProfile({
				username: handle,
				displayName: displayName.trim() || handle,
				photoData: photo
			});
			toast.success("Profile saved");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not save");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => void onSubmit(e),
		className: cn("flex h-full flex-col gap-5", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-medium tracking-tight",
				children: "Profile"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Your handle is public so people can find you. Message history never leaves this browser."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex cursor-pointer flex-col items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
						name: displayName || username,
						photo,
						size: "lg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-medium text-muted",
						children: "Change photo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "file",
						accept: "image/*",
						className: "sr-only",
						onChange: (e) => void onPhoto(e.target.files?.[0])
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "profile-username",
						children: "Username"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "profile-username",
						value: username,
						onChange: (e) => setUsername(e.target.value.toLowerCase())
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "profile-name",
						children: "Display name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "profile-name",
						value: displayName,
						onChange: (e) => setDisplayName(e.target.value)
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Save"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-md border border-border bg-surface-2 p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-fg",
							children: "Desktop alerts"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-xs text-muted",
							children: "Notify when a message or call arrives and this tab is in the background."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "switch",
						"aria-checked": alertsEnabled,
						"aria-label": "Desktop alerts",
						onClick: () => {
							if (alertsEnabled) setAlertsOn(false);
							else enableAlerts();
						},
						className: cn("relative h-7 w-12 shrink-0 rounded-full transition-[background-color] duration-150", alertsEnabled ? "bg-accent" : "border border-border bg-surface"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute top-0.5 size-6 rounded-full transition-transform duration-150", alertsEnabled ? "translate-x-5 bg-accent-fg" : "translate-x-0.5 bg-fg") })
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto rounded-md border border-border bg-surface-2 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs text-muted",
					children: "Account"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})]
			})
		]
	});
}
function Composer() {
	const { send, setTyping } = useMessenger();
	const [text, setText] = (0, import_react.useState)("");
	const [recording, setRecording] = (0, import_react.useState)(false);
	const [elapsed, setElapsed] = (0, import_react.useState)(0);
	const taRef = (0, import_react.useRef)(null);
	const recRef = (0, import_react.useRef)(null);
	const chunksRef = (0, import_react.useRef)([]);
	const startedRef = (0, import_react.useRef)(0);
	const imageRef = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = taRef.current;
		if (!el) return;
		el.style.height = "0px";
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	}, [text]);
	(0, import_react.useEffect)(() => {
		if (!recording) return;
		const id = setInterval(() => setElapsed(Date.now() - startedRef.current), 200);
		return () => clearInterval(id);
	}, [recording]);
	(0, import_react.useEffect)(() => {
		return () => {
			setTyping(false);
			recRef.current?.stop();
		};
	}, [setTyping]);
	function onChange(value) {
		setText(value);
		setTyping(value.trim().length > 0);
	}
	async function submit(body = text, media) {
		const next = body.trim();
		if (!next && !media) return;
		setText("");
		setTyping(false);
		await send({
			body: next,
			media: media ?? null
		});
		taRef.current?.focus();
	}
	async function onFiles(files) {
		const file = files?.[0];
		if (!file) return;
		try {
			const media = await fileToMedia(file);
			await submit(text, media);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not attach that file");
		}
	}
	async function toggleRecord() {
		if (recording) {
			recRef.current?.stop();
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const rec = new MediaRecorder(stream);
			chunksRef.current = [];
			rec.ondataavailable = (e) => {
				if (e.data.size) chunksRef.current.push(e.data);
			};
			rec.onstop = () => {
				stream.getTracks().forEach((t) => t.stop());
				setRecording(false);
				const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
				const duration = Date.now() - startedRef.current;
				if (duration < 400) return;
				blobToVoice(blob, duration).then((media) => submit("", media)).catch((err) => toast.error(err instanceof Error ? err.message : "Could not send voice note"));
			};
			recRef.current = rec;
			startedRef.current = Date.now();
			setElapsed(0);
			setRecording(true);
			rec.start();
		} catch {
			toast.error("Microphone permission is needed for voice notes.");
		}
	}
	function onKey(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border bg-bg/80 px-3 py-3 backdrop-blur-sm",
		children: [recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-danger" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular-nums text-fg",
					children: formatDuration(elapsed)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "Recording"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "ml-auto text-muted hover:text-fg",
					onClick: () => {
						recRef.current?.stop();
						chunksRef.current = [];
					},
					"aria-label": "Cancel recording",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})
			]
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end gap-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: imageRef,
					type: "file",
					accept: "image/*",
					className: "sr-only",
					"aria-hidden": true,
					tabIndex: -1,
					onChange: (e) => {
						onFiles(e.target.files);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: fileRef,
					type: "file",
					className: "sr-only",
					"aria-hidden": true,
					tabIndex: -1,
					onChange: (e) => {
						onFiles(e.target.files);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "icon-sm",
					variant: "ghost",
					className: "text-muted",
					onClick: () => imageRef.current?.click(),
					"aria-label": "Send photo",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image$1, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "icon-sm",
					variant: "ghost",
					className: "text-muted",
					onClick: () => fileRef.current?.click(),
					"aria-label": "Send file",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					ref: taRef,
					rows: 1,
					value: text,
					onChange: (e) => onChange(e.target.value),
					onKeyDown: onKey,
					onPaste: (e) => {
						const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
						if (file) {
							e.preventDefault();
							onFiles({
								0: file,
								length: 1,
								item: () => file
							});
						}
					},
					placeholder: "Write a message",
					className: cn("max-h-40 min-h-11 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-fg", "placeholder:text-faint outline-none focus-visible:ring-2 focus-visible:ring-accent/40")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "icon-sm",
					variant: recording ? "danger" : "ghost",
					className: recording ? "" : "text-muted",
					onClick: () => void toggleRecord(),
					"aria-label": recording ? "Stop recording" : "Voice note",
					children: recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "icon-sm",
					onClick: () => void submit(),
					disabled: !text.trim() && !recording,
					"aria-label": "Send",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {})
				})
			]
		})]
	});
}
function Receipt({ status, mine }) {
	if (!mine) return null;
	if (status === "failed") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-[10px] text-danger",
		children: "Failed"
	});
	if (status === "read") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, { className: "size-3.5 text-accent" });
	if (status === "delivered") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, { className: "size-3.5 text-muted" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-muted" });
}
function MessageBubble({ message, mine, onOpenImage }) {
	const media = message.media;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex w-full", mine ? "justify-end" : "justify-start"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("max-w-[min(100%,22rem)] rounded-lg px-3 py-2 text-sm leading-relaxed", mine ? "rounded-br-xs bg-accent text-accent-fg" : "rounded-bl-xs bg-surface-2 text-fg"),
			children: [
				media?.kind === "image" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mb-1 block overflow-hidden rounded-sm",
					onClick: () => onOpenImage?.(media.dataUrl),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: media.dataUrl,
						alt: media.name,
						className: "max-h-64 w-full object-cover"
					})
				}) : null,
				media?.kind === "voice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1 min-w-52",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
						src: media.dataUrl,
						controls: true,
						className: "w-full"
					}), media.durationMs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: cn("mt-1 text-[11px]", mine ? "text-accent-fg/70" : "text-muted"),
						children: formatDuration(media.durationMs)
					}) : null]
				}) : null,
				media?.kind === "file" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: media.dataUrl,
					download: media.name,
					className: cn("mb-1 flex items-center gap-2 rounded-sm px-2 py-2", mine ? "bg-accent-fg/10" : "bg-bg/40"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate text-xs font-medium",
						children: media.name
					})]
				}) : null,
				message.body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap break-words",
					children: message.body
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums", mine ? "text-accent-fg/70" : "text-faint"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: new Date(message.createdAt).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit"
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, {
						status: message.status,
						mine
					})]
				})
			]
		})
	});
}
function TypingDots() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "typing-dot size-1.5 rounded-full bg-muted" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "typing-dot size-1.5 rounded-full bg-muted" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "typing-dot size-1.5 rounded-full bg-muted" })
		]
	});
}
function dayLabel(ts) {
	const d = new Date(ts);
	const today = /* @__PURE__ */ new Date();
	if (d.toDateString() === today.toDateString()) return "Today";
	const y = new Date(today);
	y.setDate(today.getDate() - 1);
	if (d.toDateString() === y.toDateString()) return "Yesterday";
	return d.toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
}
function Thread({ onBack }) {
	const { selectedId, conversations, messages, people, profile, typing, now, block, setSelectedId, startCall } = useMessenger();
	const scroller = (0, import_react.useRef)(null);
	const [image, setImage] = (0, import_react.useState)(null);
	const conv = conversations.find((c) => c.id === selectedId);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [
		messages.length,
		selectedId,
		typing
	]);
	const otherId = conv?.memberIds.find((id) => id !== profile.userId);
	const other = otherId ? people[otherId] : null;
	const title = conv?.kind === "group" ? conv.title : conv?.kind === "notes" ? "Saved" : other?.displayName ?? conv?.title ?? "Chat";
	const subtitle = conv?.kind === "group" ? `${conv.memberIds.length} members` : conv?.kind === "notes" ? "Private notes on this device" : other?.lastSeen != null && now - other.lastSeen < 25e3 ? "Online" : other?.username ? `@${other.username}` : "";
	const grouped = (0, import_react.useMemo)(() => {
		const out = [];
		for (const m of messages) {
			const key = new Date(m.createdAt).toDateString();
			const last = out[out.length - 1];
			if (last && last.key === key) last.items.push(m);
			else out.push({
				key,
				ts: m.createdAt,
				items: [m]
			});
		}
		return out;
	}, [messages]);
	const typingHere = (typing[selectedId ?? ""] ?? []).filter((id) => id !== profile.userId);
	if (!selectedId || !conv) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hidden h-full flex-col items-center justify-center bg-bg md:flex",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-2xl font-medium tracking-tight text-fg",
			children: "Pick a conversation"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-xs text-center text-sm text-muted",
			children: "Start a chat by username, or write in Saved — it never leaves this browser."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex h-full min-h-0 flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-2 border-b border-border px-2 py-2.5 md:px-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						className: "md:hidden",
						onClick: onBack,
						"aria-label": "Back",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
						name: title,
						photo: conv.kind === "dm" ? other?.photoData : null,
						lastSeen: other?.lastSeen,
						now,
						showOnline: conv.kind === "dm",
						size: "sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-medium text-fg",
							children: title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted",
							children: subtitle
						})]
					}),
					conv.kind === "dm" && otherId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "Voice call",
								onClick: () => void startCall(otherId, conv.id, false),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, {})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Voice call" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "Video call",
								onClick: () => void startCall(otherId, conv.id, true),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, {})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Video call" })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon-sm",
								variant: "ghost",
								"aria-label": "Chat actions",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EllipsisVertical, {})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
							align: "end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								className: "text-danger",
								onSelect: () => {
									block(otherId);
									setSelectedId(null);
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "size-4" }),
									"Block @",
									other?.username ?? "user"
								]
							})
						})] })
					] }) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scroller,
				className: "vesper-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 md:px-6",
				children: [
					grouped.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "pt-16 text-center text-sm text-muted",
						children: "No messages yet. Say hello."
					}) : null,
					grouped.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "py-2 text-center text-xs font-medium uppercase tracking-wider text-faint",
							children: dayLabel(g.ts)
						}), g.items.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, {
							message: m,
							mine: m.fromUserId === profile.userId,
							onOpenImage: setImage
						}, m.id))]
					}, g.key)),
					typingHere.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-start",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TypingDots, {})
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: Boolean(image),
				onOpenChange: (o) => !o && setImage(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-3xl bg-bg p-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
						className: "sr-only",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Photo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Full size" })]
					}), image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: image,
						alt: "",
						className: "max-h-[80dvh] w-full rounded-md object-contain"
					}) : null]
				})
			})
		]
	});
}
function AppShell() {
	const { selectedId, setSelectedId } = useMessenger();
	const [profileOpen, setProfileOpen] = (0, import_react.useState)(false);
	const [newChat, setNewChat] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		function onKey(e) {
			if (e.key === "Escape") {
				setProfileOpen(false);
				if (window.matchMedia("(max-width: 767px)").matches) setSelectedId(null);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [setSelectedId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("h-full w-full min-w-0 border-r border-border md:w-[20.5rem] md:shrink-0", selectedId ? "hidden md:flex md:flex-col" : "flex flex-col"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatList, {
					onOpenProfile: () => setProfileOpen(true),
					onNewChat: () => setNewChat(true)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("min-w-0 flex-1", selectedId ? "flex" : "hidden md:flex"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thread, { onBack: () => setSelectedId(null) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewChatDialog, {
				open: newChat,
				onOpenChange: setNewChat
			}),
			profileOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 flex justify-end bg-bg/60",
				onClick: () => setProfileOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: "h-full w-full max-w-md border-l border-border bg-surface p-5 shadow-panel",
					onClick: (e) => e.stopPropagation(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfilePanel, {})
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallOverlay, {})
		]
	});
}
function Onboarding({ suggestedName, onDone }) {
	const [username, setUsername] = (0, import_react.useState)(suggestedName.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20));
	const [displayName, setDisplayName] = (0, import_react.useState)(suggestedName);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function onPhoto(file) {
		if (!file) return;
		try {
			setPhoto(await fileToAvatar(file));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not use that photo");
		}
	}
	async function onSubmit(e) {
		e.preventDefault();
		const handle = username.trim().toLowerCase();
		if (!USERNAME_RE.test(handle)) {
			toast.error("Username must start with a letter, 3–20 characters.");
			return;
		}
		const name = displayName.trim() || handle;
		setBusy(true);
		try {
			onDone(await claimProfile({ data: {
				username: handle,
				displayName: name,
				photoData: photo
			} }));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not save profile");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg px-4 py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: (e) => void onSubmit(e),
			className: "stagger-in w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VesperMark, { className: "size-9" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-5 font-display text-3xl font-medium tracking-tight text-fg",
					children: "Choose your handle"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "People find you by username. Chats stay on this device — there is no cloud backup."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-6 flex cursor-pointer flex-col items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PersonAvatar, {
							name: displayName || username || "You",
							photo,
							size: "lg"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-muted",
							children: "Add a photo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/*",
							className: "sr-only",
							onChange: (e) => void onPhoto(e.target.files?.[0])
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "username",
							children: "Username"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "username",
							autoComplete: "username",
							value: username,
							onChange: (e) => setUsername(e.target.value.toLowerCase()),
							placeholder: "yourname",
							required: true
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "displayName",
							children: "Display name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "displayName",
							value: displayName,
							onChange: (e) => setDisplayName(e.target.value),
							placeholder: "Your name",
							required: true
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "mt-6 w-full",
					disabled: busy,
					children: busy ? "Saving…" : "Enter Vesper"
				})
			]
		})
	});
}
function LoadingScreen({ label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg px-6 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VesperMark, { className: "size-10" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-2xl font-medium tracking-tight text-fg",
					children: "Vesper"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: label
				})
			]
		})
	});
}
function MessengerGate({ selectedId }) {
	const { user, isPending } = useCurrentUserState();
	const [profile, setProfile] = (0, import_react.useState)("loading");
	const [sel, setSel] = (0, import_react.useState)(selectedId);
	(0, import_react.useEffect)(() => {
		setSel(selectedId);
	}, [selectedId]);
	(0, import_react.useEffect)(() => {
		function onPop() {
			const path = window.location.pathname;
			if (path.startsWith("/c/")) setSel(decodeURIComponent(path.slice(3)));
			else setSel(null);
		}
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setProfile("loading");
			return;
		}
		let alive = true;
		setProfile("loading");
		getMyProfile().then((p) => {
			if (alive) setProfile(p);
		}).catch(() => {
			if (alive) setProfile(null);
		});
		return () => {
			alive = false;
		};
	}, [user?.id]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingScreen, { label: "Opening your inbox…" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginPage, {});
	if (profile === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingScreen, { label: "Loading your profile…" });
	if (!profile) {
		const fromEmail = user.primaryEmail?.split("@")[0] || "";
		const suggested = /^[a-z][a-z0-9_]{2,19}$/.test(fromEmail) ? fromEmail : user.displayName || fromEmail || "you";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {
			suggestedName: suggested,
			onDone: (next) => setProfile(next)
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessengerProvider, {
		user,
		profile,
		selectedId: sel,
		onSelectedId: (id) => {
			setSel(id);
			if (id) window.history.replaceState(null, "", `/c/${encodeURIComponent(id)}`);
			else window.history.replaceState(null, "", "/");
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {})
	});
}
//#endregion
export { MessengerGate as t };
