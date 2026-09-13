import { o as __toESM } from "../_runtime.mjs";
import { A as boolean, D as _enum, F as object, P as number, R as string, k as array } from "../_libs/@better-auth/core+[...].mjs";
import { t as GROK_PROVIDERS } from "./server-C4WtiVnI.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as signIn, t as authClient } from "./client-CVqXY6bk.mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { a as USERNAME_RE, n as MAX_MEDIA_CHARS, o as authMiddleware, r as MAX_TEXT, t as MAX_AVATAR_CHARS } from "./types-DHZ9OTkD.mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-Dz-rvAaT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[opacity,transform,background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-surface-2 text-fg border border-border hover:border-border-strong",
			ghost: "text-fg hover:bg-surface-2",
			outline: "border border-border bg-transparent text-fg hover:bg-surface-2",
			danger: "bg-danger text-fg hover:opacity-90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 px-3 text-[13px]",
			lg: "h-12 px-5",
			icon: "size-11",
			"icon-sm": "size-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg", "placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-150", "focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40", "disabled:opacity-40", className),
		...props
	});
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: cn("text-sm font-medium text-muted", className),
		...props
	});
}
function VesperMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		fill: "none",
		className: cn("text-accent", className),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "6",
				width: "26",
				height: "20",
				rx: "5",
				stroke: "currentColor",
				strokeWidth: "1.6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M5 9.5 L16 17.5 L27 9.5",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "23.5",
				cy: "21",
				r: "2.2",
				fill: "currentColor"
			})
		]
	});
}
function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		decorative,
		orientation,
		className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className),
		...props
	});
}
/** Better Auth needs an email; the user only ever types a username. */
var HANDLE_DOMAIN = "users.vesper.app";
function handleEmail(username) {
	return `${username.trim().toLowerCase()}@${HANDLE_DOMAIN}`;
}
function loginIdentity(input) {
	const v = input.trim().toLowerCase();
	if (v.includes("@")) return v;
	return handleEmail(v);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var usernameSchema = string().trim().toLowerCase().regex(USERNAME_RE, "Use 3–20 characters: start with a letter, then letters, numbers, or _");
var getMyProfile = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("a3189f67e7a0e318bea90c0c87dd68570f6485003ebff7e8c62d3681fdd78474"));
var claimProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	username: usernameSchema,
	displayName: string().trim().min(1).max(40),
	photoData: string().max(MAX_AVATAR_CHARS).nullable().optional()
}).parse(input)).handler(createSsrRpc("f89dbf5998bd1ebacdc943cd99fe9ee3e55c367aa528bffd66eff835265ff473"));
var searchUsers = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ q: string().trim().min(1).max(20) }).parse(input)).handler(createSsrRpc("8e108dd2cc150e5c5bb46344103cd16f71d8c852d0c9c4cd1e245bf3b96c6ce6"));
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
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	conversationId: string().min(1).max(200).optional(),
	peerUserId: string().min(1).max(80).optional(),
	clientId: string().uuid(),
	body: string().max(MAX_TEXT),
	media: mediaSchema,
	createdAt: number().int()
}).parse(input)).handler(createSsrRpc("2748136a3810e1344109cd073c261fd1b20f37857efcab2c536086c32317efdf"));
var createGroup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	title: string().trim().min(1).max(40),
	memberUserIds: array(string().min(1).max(80)).max(19)
}).parse(input)).handler(createSsrRpc("e8fa6613dd254baa924a6b136e67b39d8061bf2718784a0164fa16310d142724"));
var sendReceipts = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	conversationId: string().min(1).max(200),
	items: array(object({
		messageId: string().min(1).max(80),
		toUserId: string().min(1).max(80)
	})).max(80)
}).parse(input)).handler(createSsrRpc("52dbc31b755634a82563a1cf07f4362bf255ff415e1a1e7431bfe38b678e5c2b"));
var blockUser = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ userId: string().min(1).max(80) }).parse(input)).handler(createSsrRpc("55b25fb47ec13ad61c8682dbf2a8b26de7d00e92c74cf3be7e0126a32ea442b8"));
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
}).parse(input)).handler(createSsrRpc("819b0b4efaa45b20ddb6ab25c02ee54e9b1074d10844aecfc8afad563d73ad2a"));
var syncInbox = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({
	ackIds: array(string().min(1).max(80)).max(100),
	typingConversationId: string().min(1).max(200).nullable().optional()
}).parse(input)).handler(createSsrRpc("3fbebc3671122b13df43285bbe06e69128780fee6700430087c5fe5a0cc19df1"));
async function claimWhenReady(username, displayName) {
	let last;
	for (let i = 0; i < 5; i++) try {
		await claimProfile({ data: {
			username,
			displayName,
			photoData: null
		} });
		return;
	} catch (err) {
		last = err;
		await new Promise((r) => setTimeout(r, 200 * (i + 1)));
	}
	throw last instanceof Error ? last : /* @__PURE__ */ new Error("Could not claim username");
}
function LoginPage() {
	const [mode, setMode] = (0, import_react.useState)("in");
	const [username, setUsername] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function onSubmit(e) {
		e.preventDefault();
		setError(null);
		const handle = username.trim().toLowerCase();
		if (mode === "up" && !USERNAME_RE.test(handle)) {
			setError("Username must start with a letter, 3–20 characters.");
			return;
		}
		setBusy(true);
		try {
			if (mode === "up") {
				const display = name.trim() || handle;
				const { error: err } = await authClient.signUp.email({
					email: handleEmail(handle),
					password,
					name: display
				});
				if (err) throw new Error(err.message || "Could not create account");
				try {
					await claimWhenReady(handle, display);
				} catch {}
			} else {
				const { error: err } = await authClient.signIn.email({
					email: loginIdentity(handle),
					password
				});
				if (err) throw new Error(err.message || "Could not sign in");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not sign in");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid min-h-dvh w-full max-w-5xl md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hidden flex-col justify-between border-r border-border px-10 py-12 md:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VesperMark, { className: "size-10" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "stagger-in max-w-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium uppercase tracking-[0.18em] text-muted",
								children: "Local-first"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-4 font-display text-5xl font-medium leading-[1.1] tracking-tight text-fg",
								children: "Messages that live on this device."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-5 text-sm leading-relaxed text-muted",
								children: "Sign in with a username. No email, no phone. History stays in this browser."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-faint",
						children: "Voice and video. Alerts when you are away."
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "flex items-center px-5 py-8 sm:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto w-full max-w-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-6 md:hidden",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VesperMark, { className: "size-9" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "mt-4 font-display text-3xl font-medium tracking-tight",
									children: "Vesper"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm text-muted",
									children: "Username. Local history. Calls."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl font-medium tracking-tight",
							children: mode === "in" ? "Welcome back" : "Create your account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: mode === "in" ? "Sign in with your username and password." : "Pick a username. That is how people find you — no email needed."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => void onSubmit(e),
							className: "mt-5 space-y-3",
							children: [
								mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "name",
										children: "Display name"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "name",
										value: name,
										onChange: (e) => setName(e.target.value),
										autoComplete: "name",
										placeholder: "Your name"
									})]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "username",
										children: "Username"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "username",
										value: username,
										onChange: (e) => setUsername(e.target.value.toLowerCase()),
										autoComplete: "username",
										required: true,
										placeholder: "yourname"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "password",
										children: "Password"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "password",
										type: "password",
										value: password,
										onChange: (e) => setPassword(e.target.value),
										autoComplete: mode === "up" ? "new-password" : "current-password",
										required: true,
										minLength: 8,
										placeholder: "At least 8 characters"
									})]
								}),
								error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-danger",
									children: error
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									className: "w-full",
									disabled: busy,
									children: busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-4 text-sm text-muted",
							children: [
								mode === "in" ? "New here?" : "Already have an account?",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-fg underline-offset-4 hover:underline",
									onClick: () => {
										setMode(mode === "in" ? "up" : "in");
										setError(null);
									},
									children: mode === "in" ? "Create an account" : "Sign in"
								})
							]
						}),
						GROK_PROVIDERS.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "my-5 flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "flex-1" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs uppercase tracking-wider text-faint",
									children: "or"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "flex-1" })
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: "outline",
								className: "w-full",
								onClick: () => void signIn(p.providerId, { callbackURL: "/" }),
								children: ["Continue with ", p.label]
							}, p.providerId))
						})] }) : null
					]
				})
			})]
		})
	});
}
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
//#endregion
export { VesperMark as a, createGroup as c, sendCallSignal as d, sendMessage as f, useCurrentUserState as g, useCurrentUser as h, LoginPage as i, getMyProfile as l, syncInbox as m, Input as n, blockUser as o, sendReceipts as p, Label as r, claimProfile as s, Button as t, searchUsers as u };
