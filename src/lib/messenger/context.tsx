import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { liveQuery } from "dexie";
import { toast } from "sonner";
import type { AppUser } from "@/lib/auth/use-current-user";
import {
  blockUser as blockUserFn,
  claimProfile,
  createGroup as createGroupFn,
  searchUsers as searchUsersFn,
  sendCallSignal,
  sendMessage as sendMessageFn,
  sendReceipts as sendReceiptsFn,
  syncInbox,
} from "./server";
import { bumpConversation, ensureNotes, getLocalDb, upsertPerson, type VesperDB } from "./local-db";
import { dmId, isNotesId, previewText } from "./ids";
import { CallEngine, startRing, type ActiveCall, type SignalOut } from "./calls";
import {
  alertsEnabled,
  ensureNotifyPermission,
  pushBrowserAlert,
  setAlertsEnabled as persistAlertsEnabled,
  setUnreadTitle,
  type InboxAlert,
} from "./notify";
import { ONLINE_MS, type DirectoryHit, type InboxSnapshot, type LocalConversation, type LocalMedia, type LocalMessage, type LocalPerson, type Profile } from "./types";

type MessengerValue = {
  user: AppUser;
  profile: Profile;
  db: VesperDB;
  conversations: LocalConversation[];
  people: Record<string, LocalPerson>;
  typing: Record<string, string[]>;
  now: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  messages: LocalMessage[];
  refreshProfile: (patch: { username: string; displayName: string; photoData?: string | null }) => Promise<void>;
  searchUsers: (q: string) => Promise<DirectoryHit[]>;
  openDm: (peer: DirectoryHit) => Promise<string>;
  createGroup: (title: string, members: DirectoryHit[]) => Promise<string>;
  send: (opts: { body: string; media?: LocalMedia | null }) => Promise<void>;
  setTyping: (on: boolean) => void;
  block: (userId: string) => Promise<void>;
  call: ActiveCall | null;
  startCall: (peerId: string, conversationId: string, video: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  alertsEnabled: boolean;
  setAlertsOn: (on: boolean) => void;
  enableAlerts: () => Promise<void>;
  alerts: InboxAlert[];
  markAlertsRead: () => void;
};

const MessengerContext = createContext<MessengerValue | null>(null);

function errMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong";
}

export function MessengerProvider({
  user,
  profile: initialProfile,
  selectedId,
  onSelectedId,
  children,
}: {
  user: AppUser;
  profile: Profile;
  selectedId: string | null;
  onSelectedId: (id: string | null) => void;
  children: ReactNode;
}) {
  const db = useMemo(() => getLocalDb(user.id), [user.id]);
  const [profile, setProfile] = useState(initialProfile);
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [people, setPeople] = useState<Record<string, LocalPerson>>({});
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [typing, setTypingMap] = useState<Record<string, string[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [alertsOn, setAlertsOnState] = useState(() => alertsEnabled());
  const [alerts, setAlerts] = useState<InboxAlert[]>([]);
  const selectedRef = useRef(selectedId);
  const typingRef = useRef(false);
  const lastTypingSent = useRef(false);
  const lastTypingAt = useRef(0);
  const ackQueue = useRef<string[]>([]);
  const engineRef = useRef<CallEngine | null>(null);
  const stopRing = useRef<(() => void) | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const inCallRef = useRef(false);
  const receiptSent = useRef(new Set<string>());
  const peopleRef = useRef(people);
  peopleRef.current = people;
  selectedRef.current = selectedId;
  callRef.current = call;
  inCallRef.current = Boolean(call);

  useEffect(() => {
    void ensureNotes(db, user.id);
    void db.people.toArray().then((rows) => {
      const map: Record<string, LocalPerson> = {};
      for (const row of rows) map[row.userId] = row;
      setPeople((prev) => ({ ...map, ...prev }));
    });
  }, [db, user.id]);

  useEffect(() => {
    const sub = liveQuery(() => db.conversations.orderBy("lastAt").reverse().toArray()).subscribe({
      next: setConversations,
      error: () => {},
    });
    return () => sub.unsubscribe();
  }, [db]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const sub = liveQuery(() =>
      db.messages.where("conversationId").equals(selectedId).sortBy("createdAt"),
    ).subscribe({
      next: setMessages,
      error: () => {},
    });
    return () => sub.unsubscribe();
  }, [db, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void db.conversations.update(selectedId, { unread: 0 });
  }, [db, selectedId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const mergePeople = useCallback(
    (hits: DirectoryHit[]) => {
      if (hits.length === 0) return;
      setPeople((prev) => {
        let changed = false;
        const next = { ...prev };
        const persist: LocalPerson[] = [];
        const t = Date.now();
        for (const hit of hits) {
          const old = next[hit.userId];
          const lastSeen = hit.lastSeen;
          const photo = hit.photoData || old?.photoData || null;
          const displayName = hit.displayName || old?.displayName || hit.username;
          const username = hit.username || old?.username || "";
          const wasOnline = old?.lastSeen != null && t - old.lastSeen < ONLINE_MS;
          const isOnline = lastSeen != null && t - lastSeen < ONLINE_MS;
          const identityChanged =
            !old ||
            old.username !== username ||
            old.displayName !== displayName ||
            (hit.photoData && hit.photoData !== old.photoData);
          const presenceChanged = wasOnline !== isOnline;
          if (!identityChanged && !presenceChanged && old) continue;
          const person: LocalPerson = {
            userId: hit.userId,
            username,
            displayName,
            photoData: photo,
            lastSeen,
          };
          next[hit.userId] = person;
          changed = true;
          if (identityChanged) persist.push(person);
        }
        if (persist.length) {
          void (async () => {
            for (const p of persist) await upsertPerson(db, p);
          })();
        }
        return changed ? next : prev;
      });
    },
    [db],
  );

  const addAlert = useCallback((title: string, body: string, conversationId?: string) => {
    const item: InboxAlert = {
      id: crypto.randomUUID(),
      title,
      body,
      conversationId,
      at: Date.now(),
      read: false,
    };
    setAlerts((prev) => [item, ...prev].slice(0, 30));
    if (alertsEnabled()) {
      pushBrowserAlert(title, body, conversationId || item.id);
      toast(title, { description: body });
    }
  }, []);

  const signal = useCallback((toUserId: string, conversationId: string, payload: SignalOut) => {
    void sendCallSignal({
      data: {
        conversationId,
        toUserId,
        callId: payload.callId,
        action: payload.action,
        video: payload.video,
        sdp: payload.sdp,
        ice: payload.ice,
      },
    }).catch(() => {});
  }, []);

  const hangup = useCallback(() => {
    stopRing.current?.();
    stopRing.current = null;
    const engine = engineRef.current;
    const current = callRef.current;
    engineRef.current = null;
    if (engine && current) {
      signal(current.peerId, current.conversationId, {
        action: "hangup",
        callId: current.id,
        video: current.video,
      });
      engine.close();
    }
    setCall(null);
  }, [signal]);

  const attachEngine = useCallback(
    (next: ActiveCall) => {
      const engine = new CallEngine(
        next,
        (sig) => {
          signal(next.peerId, next.conversationId, sig);
        },
        (stream) => {
          setCall((c) => (c ? { ...c, remoteStream: stream, status: stream ? "live" : c.status } : c));
        },
      );
      engineRef.current = engine;
      return engine;
    },
    [signal],
  );

  const startCall = useCallback(
    async (peerId: string, conversationId: string, video: boolean) => {
      if (engineRef.current) hangup();
      const id = crypto.randomUUID();
      const next: ActiveCall = {
        id,
        peerId,
        conversationId,
        video,
        role: "outgoing",
        status: "ringing",
        muted: false,
        cameraOff: false,
        localStream: null,
        remoteStream: null,
      };
      const engine = attachEngine(next);
      try {
        await engine.startMedia();
        setCall({ ...engine.call });
        signal(peerId, conversationId, {
          action: "invite",
          callId: id,
          video,
        });
        stopRing.current = startRing();
      } catch {
        engine.close();
        engineRef.current = null;
        toast.error("Microphone or camera permission is needed to call.");
      }
    },
    [attachEngine, hangup, signal],
  );

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || current.role !== "incoming") return;
    stopRing.current?.();
    stopRing.current = null;
    const engine = engineRef.current ?? attachEngine(current);
    try {
      await engine.startMedia();
      setCall({ ...engine.call, status: "connecting" });
      signal(current.peerId, current.conversationId, {
        action: "accept",
        callId: current.id,
        video: current.video,
      });
    } catch {
      toast.error("Microphone or camera permission is needed to answer.");
      hangup();
    }
  }, [attachEngine, hangup, signal]);

  const rejectCall = useCallback(() => {
    const current = callRef.current;
    stopRing.current?.();
    stopRing.current = null;
    if (current) {
      signal(current.peerId, current.conversationId, {
        action: "reject",
        callId: current.id,
        video: current.video,
      });
    }
    engineRef.current?.close();
    engineRef.current = null;
    setCall(null);
  }, [signal]);

  const toggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setMuted(!engine.call.muted);
    setCall({ ...engine.call });
  }, []);

  const toggleCamera = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setCameraOff(!engine.call.cameraOff);
    setCall({ ...engine.call });
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;
      try {
        const acks = ackQueue.current.splice(0, 80);
        const typingOn = typingRef.current;
        let typingConversationId: string | null | undefined;
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
        const snap = (await syncInbox({
          data: {
            ackIds: acks,
            typingConversationId,
          },
        })) as InboxSnapshot;
        if (stopped) return;
        mergePeople(snap.people);
        const typingNext: Record<string, string[]> = {};
        for (const t of snap.typing) {
          (typingNext[t.conversationId] ??= []).push(t.userId);
        }
        setTypingMap(typingNext);

        for (const ev of snap.events) {
          ackQueue.current.push(ev.id);
          if (ev.kind === "message") {
            const body = String(ev.payload.body ?? "");
            const media = (ev.payload.media as LocalMedia | null) ?? null;
            const createdAt = Number(ev.payload.createdAt ?? ev.createdAt);
            const id = String(ev.payload.id ?? ev.id);
            const memberIds = (ev.payload.memberIds as string[]) ?? [];
            const kind = (ev.payload.conversationKind as LocalConversation["kind"]) ?? "dm";
            const title = String(ev.payload.conversationTitle ?? "");
            const existing = await db.messages.get(id);
            if (!existing) {
              await db.messages.put({
                id,
                conversationId: ev.conversationId,
                fromUserId: ev.fromUserId,
                body,
                createdAt,
                status: "delivered",
                media,
              });
              const viewing = selectedRef.current === ev.conversationId;
              if (!viewing) {
                const from = peopleRef.current[ev.fromUserId];
                const name = from?.displayName || ev.payload.from?.displayName || "New message";
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
              resetUnread: viewing,
            });
            if (ev.payload.from) {
              mergePeople([
                {
                  userId: ev.payload.from.userId,
                  username: ev.payload.from.username,
                  displayName: ev.payload.from.displayName,
                  photoData: ev.payload.from.photoData ?? null,
                  lastSeen: Date.now(),
                  online: true,
                },
              ]);
            }
          } else if (ev.kind === "invite") {
            const memberIds = (ev.payload.memberIds as string[]) ?? [];
            const title = String(ev.payload.conversationTitle ?? "Group");
            await bumpConversation(db, {
              id: ev.conversationId,
              kind: "group",
              title,
              memberIds,
              lastMessage: "You were added",
              lastAt: ev.createdAt || Date.now(),
            });
          } else if (ev.kind === "receipt") {
            const messageId = String(ev.payload.messageId ?? "");
            const status = ev.payload.status === "read" ? "read" : "delivered";
            if (messageId) {
              const msg = await db.messages.get(messageId);
              if (msg && msg.fromUserId === user.id) {
                const rank = { sending: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
                if (rank[status] > rank[msg.status]) {
                  await db.messages.update(messageId, { status });
                }
              }
            }
          } else if (ev.kind === "call") {
            const action = String(ev.payload.action ?? "");
            const callId = String(ev.payload.callId ?? "");
            const video = Boolean(ev.payload.video);
            const current = callRef.current;
            if (action === "invite") {
              if (current) {
                signal(ev.fromUserId, ev.conversationId, {
                  action: "reject",
                  callId,
                  video,
                });
              } else {
                const incoming: ActiveCall = {
                  id: callId,
                  peerId: ev.fromUserId,
                  conversationId: ev.conversationId,
                  video,
                  role: "incoming",
                  status: "ringing",
                  muted: false,
                  cameraOff: false,
                  localStream: null,
                  remoteStream: null,
                };
                attachEngine(incoming);
                setCall(incoming);
                stopRing.current = startRing();
                const name =
                  ev.payload.from?.displayName ||
                  peopleRef.current[ev.fromUserId]?.displayName ||
                  "Incoming call";
                addAlert(name, video ? "Video call" : "Voice call", ev.conversationId);
                if (ev.payload.from) {
                  mergePeople([
                    {
                      userId: ev.payload.from.userId,
                      username: ev.payload.from.username,
                      displayName: ev.payload.from.displayName,
                      photoData: ev.payload.from.photoData ?? null,
                      lastSeen: Date.now(),
                      online: true,
                    },
                  ]);
                }
              }
            } else if (current && current.id === callId) {
              const engine = engineRef.current;
              if (action === "accept" && current.role === "outgoing") {
                stopRing.current?.();
                stopRing.current = null;
                void engine?.makeOffer();
                setCall((c) => (c ? { ...c, status: "connecting" } : c));
              } else if (action === "offer" && ev.payload.sdp) {
                void engine?.takeOffer(ev.payload.sdp);
              } else if (action === "answer" && ev.payload.sdp) {
                void engine?.takeAnswer(ev.payload.sdp);
              } else if (action === "ice" && ev.payload.ice) {
                void engine?.takeIce(ev.payload.ice);
              } else if (action === "reject" || action === "hangup") {
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
      } catch {
        /* offline / signed out mid-poll */
      }
      const hidden = typeof document !== "undefined" && document.hidden;
      const delay = inCallRef.current ? 280 : hidden ? 3000 : 700;
      timer = setTimeout(() => void tick(), delay);
    };

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [addAlert, attachEngine, db, mergePeople, signal, user.id]);

  useEffect(() => {
    if (!selectedId || isNotesId(selectedId)) return;
    const unreadFromOthers = messages.filter(
      (m) => m.fromUserId !== user.id && !receiptSent.current.has(m.id),
    );
    if (unreadFromOthers.length === 0) return;
    for (const m of unreadFromOthers) receiptSent.current.add(m.id);
    const items = unreadFromOthers.map((m) => ({ messageId: m.id, toUserId: m.fromUserId }));
    const t = setTimeout(() => {
      void sendReceiptsFn({ data: { conversationId: selectedId, items } }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [messages, selectedId, user.id]);

  useEffect(() => {
    const unread = conversations.reduce((n, c) => n + (c.unread || 0), 0);
    setUnreadTitle(unread);
    return () => setUnreadTitle(0);
  }, [conversations]);

  useEffect(
    () => () => {
      stopRing.current?.();
      engineRef.current?.close();
    },
    [],
  );

  const refreshProfile = useCallback(
    async (patch: { username: string; displayName: string; photoData?: string | null }) => {
      const next = await claimProfile({ data: patch });
      setProfile(next);
    },
    [],
  );

  const searchUsers = useCallback(async (q: string) => {
    return searchUsersFn({ data: { q } });
  }, []);

  const openDm = useCallback(
    async (peer: DirectoryHit) => {
      const id = dmId(user.id, peer.userId);
      await upsertPerson(db, {
        userId: peer.userId,
        username: peer.username,
        displayName: peer.displayName,
        photoData: peer.photoData,
        lastSeen: peer.lastSeen,
      });
      mergePeople([peer]);
      const existing = await db.conversations.get(id);
      if (!existing) {
        await db.conversations.put({
          id,
          kind: "dm",
          title: peer.displayName,
          memberIds: [user.id, peer.userId],
          lastMessage: "New conversation",
          lastAt: Date.now(),
          unread: 0,
        });
      }
      return id;
    },
    [db, mergePeople, user.id],
  );

  const createGroup = useCallback(
    async (title: string, members: DirectoryHit[]) => {
      const result = await createGroupFn({
        data: { title, memberUserIds: members.map((m) => m.userId) },
      });
      mergePeople(result.people);
      await db.conversations.put({
        id: result.conversationId,
        kind: "group",
        title,
        memberIds: result.memberIds,
        lastMessage: "Group created",
        lastAt: Date.now(),
        unread: 0,
      });
      return result.conversationId;
    },
    [db, mergePeople],
  );

  const send = useCallback(
    async (opts: { body: string; media?: LocalMedia | null }) => {
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
        media,
      });
      await bumpConversation(db, {
        id: conversationId,
        kind: conv?.kind ?? (isNotesId(conversationId) ? "notes" : "dm"),
        title: conv?.title ?? "Chat",
        memberIds: conv?.memberIds ?? [user.id],
        lastMessage: previewText(body, media?.kind),
        lastAt: createdAt,
        resetUnread: true,
      });
      if (isNotesId(conversationId)) {
        await db.messages.update(id, { status: "read" });
        return;
      }
      try {
        const peerUserId = (conv?.memberIds ?? []).find((m) => m !== user.id);
        await sendMessageFn({
          data: {
            conversationId,
            peerUserId,
            clientId: id,
            body,
            media,
            createdAt,
          },
        });
        await db.messages.update(id, { status: "sent" });
      } catch (err) {
        await db.messages.update(id, { status: "failed" });
        toast.error(errMessage(err));
      }
    },
    [db, user.id],
  );

  const setTyping = useCallback((on: boolean) => {
    typingRef.current = on;
  }, []);

  const block = useCallback(async (userId: string) => {
    await blockUserFn({ data: { userId } });
    toast.success("Blocked. They will not be able to write to you.");
  }, []);

  const setAlertsOn = useCallback((on: boolean) => {
    persistAlertsEnabled(on);
    setAlertsOnState(on);
    if (on) void ensureNotifyPermission();
  }, []);

  const enableAlerts = useCallback(async () => {
    const ok = await ensureNotifyPermission();
    persistAlertsEnabled(true);
    setAlertsOnState(true);
    if (!ok) toast.error("Alerts are blocked in the browser settings.");
  }, []);

  const markAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const value = useMemo<MessengerValue>(
    () => ({
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
      searchUsers,
      openDm,
      createGroup,
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
      markAlertsRead,
    }),
    [
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
      searchUsers,
      openDm,
      createGroup,
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
      markAlertsRead,
    ],
  );

  return <MessengerContext.Provider value={value}>{children}</MessengerContext.Provider>;
}

export function useMessenger(): MessengerValue {
  const ctx = useContext(MessengerContext);
  if (!ctx) throw new Error("useMessenger must be used within MessengerProvider");
  return ctx;
}
