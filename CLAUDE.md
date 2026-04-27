# Cipher — Encrypted Messaging App

A two-layer encrypted messaging PWA built by Jordan and Claude. Cipher aesthetic on top, AES-256-GCM underneath. Pre-shared key model — the key never touches the server.

## Live app
- **URL:** readyboxsystems.github.io/cipher
- **Target domain:** cipher.readyboxhq.com (subdomain not yet configured)
- **Host:** GitHub Pages (auto-deploys on push to `main`)
- **GitHub repo:** github.com/ReadyBoxSystems/cipher
- **Backend:** Supabase (project: cipher, org: ReadyBoxSystems)
- **Supabase URL:** https://bytywhlpcdapomzrpiwz.supabase.co

## The concept
Two people pre-share two things out of band (in person, phone call, etc.):
1. **Which cipher** to use (Caesar, Vigenère, Atbash, Rail Fence, Polybius, Morse, Elder Futhark)
2. **The key** (a number, a word, or a passphrase)

Neither piece of information is ever stored anywhere. The server only ever sees AES-256-GCM encrypted blobs.

**Sending a message:**
1. User types plaintext
2. App applies the historical cipher (aesthetic layer)
3. App AES-256-GCM encrypts the cipher output using the key via PBKDF2 key derivation
4. Encrypted blob stored in Supabase — server sees nothing readable

**Receiving a message:**
1. Recipient opens the app, sees a locked message
2. Enters the pre-shared key
3. AES decrypts (invisible, automatic)
4. Cipher-encoded text appears
5. Selects cipher type, hits decode
6. Plaintext revealed

**"Keep decoded for me" preference** — stores cipher + key locally on-device only. Auto-decodes on receive. Never sent to server.

## Security model
- **AES-256-GCM** via browser Web Crypto API — real encryption, not aesthetic
- **PBKDF2** key derivation (100,000 iterations, SHA-256) from the passphrase + per-message random salt
- **Key never leaves the browser** — Supabase stores: encrypted payload, IV, salt. Nothing else.
- **Cipher type is also secret** — not stored in the database. Recipient must know it out of band. This is intentional — it's the second factor.
- **No plaintext ever stored** — not even temporarily on the server
- If Supabase is fully compromised, messages are still unreadable without the key

## Stack
- **Frontend:** Vanilla JS (ES modules), no framework, no build step
- **Styling:** CSS custom properties, JetBrains Mono font, dark amber aesthetic (consistent with the cipher tool prototype)
- **Backend:** Supabase (Postgres + Auth + Realtime + Row Level Security)
- **Crypto:** Browser Web Crypto API (built-in, no library)
- **Hosting:** GitHub Pages
- **PWA:** Service worker + manifest — installable on phone home screen

## File structure
```
C:\Cipher Program\
  index.html      ← App shell, PWA meta tags
  app.js          ← Main application logic, routing, all screens
  style.css       ← Mobile-first dark UI, amber accent
  supabase.js     ← Supabase client (URL + anon key)
  crypto.js       ← AES-256-GCM encrypt/decrypt, PBKDF2 key derivation
  ciphers.js      ← All 7 historical ciphers + applyCipher() helper
  sw.js           ← Service worker (PWA caching)
  manifest.json   ← PWA manifest (install on home screen)
  schema.sql      ← Full database schema — paste into Supabase SQL Editor
  CLAUDE.md       ← This file
```

## Database schema (Supabase)
Five tables, all with Row Level Security enabled:

**profiles** — one per user
- id (uuid, FK to auth.users)
- username (text, unique)
- display_name, avatar_seed, created_at

**conversations** — a thread between two people
- id (uuid), created_at, updated_at

**conversation_members** — who is in each conversation
- conversation_id, user_id, joined_at, last_read_at
- Unique constraint: (conversation_id, user_id)

**messages** — encrypted message blobs only
- conversation_id, sender_id
- payload (AES ciphertext, base64)
- iv (base64 — needed to decrypt)
- salt (base64 — needed for PBKDF2)
- created_at

**invites** — how two people connect
- creator_id, code (8-char UUID prefix, unique)
- accepted_by, conversation_id
- expires_at (7 days from creation)

**Realtime enabled on:** messages only

## App architecture (app.js)
Single-page app with hash-based routing. No framework.

**Routes:**
- `#/` → inbox (or auth if not logged in)
- `#/auth` → sign in / sign up
- `#/setup` → username picker (first time only)
- `#/chat/:convId` → message thread
- `#/invite/:code` → accept an invite link
- `#/new` → generate a new invite link

**Key functions:**
- `route()` — reads hash, checks auth/profile state, dispatches to right screen
- `showAcceptInvite(code)` — creates conversation + adds both members when invite is accepted
- `_send(convId)` — applies cipher → AES encrypts → inserts message
- `_decode(convId)` — AES decrypts → applies cipher decode → shows plaintext

**Local state (localStorage key: 'cs'):**
Per-conversation cipher settings stored on device only:
```json
{ "convId": { "cipher": "vigenere", "key": "WOLF", "keep": false } }
```

## UX flow
1. Open app → auth screen (sign in / sign up)
2. First time → username setup (@handle)
3. Inbox — list of conversations
4. Tap **+** → generates an invite link → share it with someone
5. Recipient opens link → signs up / in → joins conversation
6. Chat opens — messages show as locked (⚿ Tap to decode)
7. Tap a message → decode panel slides up → enter cipher + key → Decode
8. "Keep decoded for me" checkbox → stores settings locally, auto-decodes future messages
9. Compose bar — cipher selector + key field + message input + send (→)

## Known issues / next session TODO
1. **Profile 409 conflict** — stale auth sessions in the browser cause a conflict when trying to create a profile that already exists. Fix: delete test users in Supabase → Authentication → Users before each fresh test run.
2. **Icons missing** — manifest.json references icon-192.png and icon-512.png which don't exist yet. Causes a 404. App still works, just no custom home screen icon.
3. **Inbox doesn't auto-refresh when new conversation created** — realtime subscription watches messages only. New conversations (from accepted invites) don't appear until you refresh or a message is sent.
4. **No push notifications yet** — messages only appear in real-time if the app is open. Background notifications require Web Push API + service worker update.
5. **No sign-out button on setup screen** — if someone gets stuck on setup with a stale session, there's no escape hatch.
6. **cipher.readyboxhq.com not yet configured** — DNS subdomain not pointed at GitHub Pages yet.

## Testing instructions
To test the two-person flow properly:
- Use two **different browsers** (e.g. Chrome + Edge) — incognito windows share sessions
- OR: one regular browser window + one incognito window (one account each)
- Before each fresh test: Supabase → Authentication → Users → delete all test users
- Run in SQL Editor to wipe table data:
  ```sql
  delete from messages;
  delete from invites;
  delete from conversation_members;
  delete from conversations;
  delete from profiles;
  ```

## ReadyBox connection
This is a ReadyBox Systems side project — demonstrates technical capability, conversation starter. Hosted under the ReadyBoxSystems GitHub org. Future: point cipher.readyboxhq.com at it once the subdomain is configured in Netlify/DNS.

## The cipher tool prototype
The standalone cipher tool (not the messaging app) lives at:
`C:\Claude Playground\cipher\index.html`
It's a desktop HTML file — the R&D prototype that led to this app. Seven ciphers, brute force, cipher wheel, Elder Futhark rune rain. Not connected to Supabase.

## Jordan's vision
Longer term: mesh network support (Meshtastic-style). Cipher-encoded messages over a local mesh with no internet required. Shade/Frame integration — this runs on Frame hardware as a native communication layer. That's a future chapter.
