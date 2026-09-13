# LocalChat

**Private. Simple. Yours.**

A username messenger. No phone number, no email required, no cloud history.
Chats, photos, files, and voice notes live on this device. The server only
relays live events, then deletes them.

## What you get

- Sign in with a **username + password**
- 1:1 chats, groups, and private Saved notes
- Text, photos, files, and voice notes
- Voice and video calls
- Typing, read receipts, and online status
- Desktop alerts when you are away
- QR code to share your handle
- Block, archive, and group info

## Run it

```bash
npm install
npm run dev
```

Then open the app in your browser. Create a username and start a chat.

## How it stays private

- Message history is stored in **IndexedDB on this browser only**
- Relayed events are acknowledged and deleted on the server
- There is no multi-device backup and no cloud transcript

Built with TanStack Start, Better Auth, Dexie, and WebRTC.
