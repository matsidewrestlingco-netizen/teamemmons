# Firebase Backend + Admin Page for Block Fundraiser

**Date:** 2026-05-21
**Project:** teamemmons (Road to Fargo block fundraiser)
**Status:** Design approved, ready for implementation plan

## Problem

The current `index.html` is a static page with 60 hardcoded "block" elements. To mark a block as claimed, the site owner must hand-edit HTML (`class="block claimed" data-by="Name"`). Two issues:

1. **Race conditions during outreach.** Multiple donors can claim the same block before the owner can update the HTML — no real-time gating.
2. **No structured intake.** The site doesn't capture donor info (name, email, phone, payment method); the owner has to coordinate over text/email separately.

## Goals

- Visitors pick a block via a form that captures their name, email, phone, and payment method (Venmo or Zelle).
- The block immediately enters a **pending** state (grayed out, "Pending — Firstname" on hover) so no one else can claim it.
- The site owner manually confirms payment from an admin dashboard, flipping the block to **claimed** (green, shows first name).
- All state changes propagate to all open browsers within ~1 second.
- Donors can opt to be displayed as "Anonymous".

## Non-goals (explicit YAGNI)

- Email/SMS confirmations to donors
- Server-side payment verification (Venmo/Zelle confirmation is manual)
- Auto-release of stale pending blocks (admin is the manual gate)
- A donor leaderboard beyond the existing grid
- Multi-language support
- Tax-deductible / 501(c)(3) flow (footer "email us" link stays as-is)

## Architecture

### Stack

- **Hosting:** Firebase Hosting (custom domain).
- **Database:** Cloud Firestore.
- **Auth:** Firebase Authentication with Google sign-in provider.
- **Client:** Vanilla HTML/CSS/JS. Firebase JS SDK loaded as ES modules from CDN. No build tool, no framework, no npm — same style as the current site.

### File structure

```
teamemmons/
├── index.html          ← existing public page; modified to read live state from Firestore
├── admin.html          ← new admin dashboard, Google sign-in gated
├── firebase.json       ← Firebase Hosting config
├── firestore.rules     ← security rules
├── .firebaserc         ← Firebase project ID
└── (existing images stay where they are)
```

No new directories, no JS bundling, no package.json.

## Data model

### Firestore collections

**`blocks/{1..60}`** — one document per block.

| Field | Type | Description |
|---|---|---|
| `amount` | number | Equals the block number (1, 2, ... 60). Stored explicitly so security rules can validate it. |
| `status` | string | `"available"` \| `"pending"` \| `"claimed"` |
| `donor.firstName` | string | Required when status ≠ available |
| `donor.lastName` | string | Required when status ≠ available |
| `donor.email` | string | Required when status ≠ available |
| `donor.phone` | string | Required when status ≠ available |
| `donor.paymentMethod` | string | `"venmo"` \| `"zelle"` |
| `donor.anonymous` | boolean | If true, public page shows "Anonymous" instead of first name |
| `pendingAt` | timestamp | Server timestamp set when block becomes pending; null otherwise |
| `claimedAt` | timestamp | Server timestamp set when admin confirms payment; null otherwise |

Block IDs are the string representation of the number (`"1"`, `"2"`, ... `"60"`) so the document path is predictable from the block number alone.

**`config/admins`** — single document with field `emails: string[]` holding the whitelist of admin Gmail addresses.

The block IS the claim record. No separate "claims" collection; no "users" collection (admins are identified by email at sign-in time).

### Initial seed

Before launch, run a one-time seed script (or paste a snippet into the Firebase console) to create the 60 block documents with `status: "available"` and matching `amount` values.

## Visitor flow (`index.html`)

### What changes

The block grid becomes dynamic. The 60 hardcoded `<div class="block">` elements are replaced with a single empty `<div id="grid">` that JavaScript fills based on Firestore data via a real-time listener.

The scoreboard (raised total, claimed count, progress bar, remaining) reads the same live data — no more recomputing from DOM classes.

Everything else in `index.html` (hero, letter, "How it works", About cards, footer, all styles, all animations) stays exactly as-is.

### Block display states

| Status | Visual | Hover tooltip |
|---|---|---|
| `available` | Existing dark style; milestones (10/20/30/40/50/60) keep the red milestone style | — |
| `pending` | Existing claimed cream/diagonal-stripe style + faint gray tint | "Pending — Firstname" (or "Pending — Anonymous") |
| `claimed` | Existing claimed style + green accent; shows first name beneath the number | First name (or "Anonymous") + amount |

(Visual styling for "pending vs claimed" distinction to be refined during implementation — current `.block.claimed` style is the base; we'll add a green variant for confirmed and keep the existing cream for pending.)

### Claim flow

1. Visitor clicks an `available` block.
2. A modal opens with the form:
   - Header: **Block #X — $X**
   - First name (required)
   - Last name (required)
   - Email (required, basic format validation)
   - Phone (required, US-format guidance, not strictly validated)
   - Payment method: radio — Venmo / Zelle (required)
   - Checkbox: "Show me as Anonymous publicly"
   - Submit button: "Reserve Block #X"
   - Cancel button / close X
3. On submit, the client runs a **Firestore transaction** on `blocks/{X}`:
   - Read the doc.
   - If `status == "available"`, set `status = "pending"`, populate `donor.*`, set `pendingAt = serverTimestamp()`.
   - If `status != "available"`, abort.
4. **Transaction success** → modal swaps to a success view:
   - "Thanks, [First name]! You've reserved Block #X for $X."
   - Payment instructions matching their chosen method:
     - Venmo: "Send $X to **@Celia-Emmons** — please include **'Block #X'** in the note." + Copy button
     - Zelle: "Send $X to **937-654-9895** — please include **'Block #X'** in the note." + Copy button
   - Soft nudge: "Please send payment within 24 hours so we can confirm your block."
   - "Close" button.
5. **Transaction failure** (block was just taken):
   - Modal shows: "Sorry — Block #X was just claimed by someone else. Please pick another." + button to close the modal so they can pick again.

### Real-time updates

The page subscribes to the entire `blocks` collection via `onSnapshot`. Any state change (someone else pending, admin confirming, admin releasing) reflects in all open browsers within ~1 second.

### Submit guard (basic abuse prevention)

Before submitting, the client checks a `localStorage` key `lastSubmitAt`. If it's less than 30 seconds ago, the submit button stays disabled and shows "Please wait a moment before submitting again." This is a soft guard — Firestore rules below are the real protection.

### All-claimed state

When the listener reports all 60 blocks have `status == "claimed"`, a celebratory banner appears above the grid: **"🎉 We did it — Weston is going to Fargo. Thank you."** Available-block hover and the modal are no-ops (none should be available to click anyway).

## Admin flow (`admin.html`)

### Sign-in

Page loads → "Sign in with Google" button is the only visible content. After successful Google sign-in:

1. Client reads `config/admins` and checks if the signed-in user's email is in `emails[]`.
2. If yes → dashboard renders.
3. If no → "Not authorized" message + Sign out button. (Sign out is also wired so the user can switch accounts.)

### Dashboard layout

- **Header bar:** "Road to Fargo · Admin" · signed-in email · Sign out button.
- **Stats row:** four cards
  - Raised (sum of `amount` for all `claimed` blocks)
  - Claimed (count) of 60
  - Pending (count)
  - Remaining $ to goal ($1,830 - raised)
- **Pending list:** all `pending` blocks, sorted by `pendingAt` ascending (oldest first). Each row shows:
  - Block #, amount, donor full name
  - Email (with `mailto:` link), phone (with `tel:` link), payment method
  - "Pended N hours ago"
  - Action buttons: **Confirm Paid**, **Release**, **Edit info**
- **Block grid:** mini version of the public grid, all 60 blocks color-coded by status. Click any block to open an action panel on the right (or modal):
  - **Available block** → button: "Manually claim" (opens form to enter donor info and mark claimed immediately — for offline cash/Venmo donations)
  - **Pending block** → Confirm Paid · Release · Edit info
  - **Claimed block** → Release · Edit info
- **Manual claim button:** also accessible as a top-level "+ Manually claim a block" button at the bottom of the page.

### Admin actions

| Action | What happens |
|---|---|
| **Confirm Paid** | Set `status = "claimed"`, `claimedAt = serverTimestamp()`. Block turns green with first name on all public browsers. |
| **Release** | Set `status = "available"`, clear `donor`, clear `pendingAt` and `claimedAt`. |
| **Edit info** | Modal form pre-filled with current donor fields; on save, updates `donor.*`. Status unchanged. |
| **Manually claim** | Same form as the public modal, but instead of going to `pending`, goes straight to `claimed` (admin is asserting payment was already received). Sets `claimedAt`; `pendingAt` stays null since the block never went through the public pending flow. |

All admin writes are wrapped in error handling that surfaces failures inline ("Couldn't save — try again.").

## Security rules

Firestore security rules (in `firestore.rules`) enforce three policies:

1. **Public read on `blocks`:**
   ```
   allow read: if true;
   ```

2. **Public can write a block only as a valid pending claim:**
   ```
   allow update: if
     resource.data.status == "available"
     && request.resource.data.status == "pending"
     && request.resource.data.amount == resource.data.amount
     && request.resource.data.donor.firstName is string
     && request.resource.data.donor.lastName is string
     && request.resource.data.donor.email is string
     && request.resource.data.donor.phone is string
     && request.resource.data.donor.paymentMethod in ["venmo", "zelle"]
     && request.resource.data.donor.anonymous is bool
     && request.resource.data.pendingAt == request.time;
   ```
   (Field-length caps and stricter email regex enforced in rules too — keeps payloads small.)

3. **Anything else (confirm, release, edit, manual claim, delete) requires admin email:**
   ```
   allow write: if
     request.auth != null
     && request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails;
   ```

4. **`config/admins`** is admin-read-only and admin-write-only (or written by hand in the Firebase console — never edited by the app).

Even if a malicious actor opens DevTools and tries to write directly to Firestore, they can't claim a block someone else already took, can't fake "claimed" status, and can't modify donor info on existing blocks.

## Error handling

| Scenario | Behavior |
|---|---|
| Firestore listener fails to connect | Public grid shows "Loading blocks… if this doesn't load, please refresh." Footer Venmo/Zelle info still visible — donors can still pay manually and reach the family by email. |
| Transaction fails (concurrent claim) | Modal shows the "just taken" message; visitor can close and pick another block. |
| Admin write fails | Inline error message on the action button: "Couldn't save — try again." Action is retryable. |
| Sign-in popup blocked / canceled | Admin page shows "Sign-in canceled — try again" with the sign-in button. |
| Whitelist check fails | "Not authorized" + Sign out. No partial dashboard rendering. |
| Form validation fails | Inline field-level errors; submit stays disabled until valid. |

## Testing approach

This is a small, mostly visual project — automated testing is not warranted. The verification plan is manual:

1. **Local dev:** Use Firebase Emulator Suite (Firestore + Auth emulators) to test without touching production data.
2. **Seed test data:** Populate emulator with 60 available blocks; manually walk through claim → confirm → release flows.
3. **Concurrent claim test:** Open two browsers, both submit the same block at once, verify only one succeeds and the other sees the polite error.
4. **Real-time test:** Open the public page in one browser, change a block from the admin page in another, confirm the public page updates within a few seconds.
5. **Security rules test:** Use the Firebase emulator's rules-testing tool to confirm a non-admin can't write `claimed` status or modify someone else's block.
6. **Mobile responsive smoke test:** Open the modal on a phone-width viewport; confirm form is usable.
7. **All-claimed banner test:** Mark all 60 claimed in the admin, confirm banner appears and form CTAs are disabled.

## Build sequence (high-level — full breakdown in implementation plan)

1. Firebase project setup (create project, enable Hosting/Firestore/Auth, configure Google sign-in, install Firebase CLI locally).
2. Add `firebase.json`, `firestore.rules`, `.firebaserc`.
3. Seed the 60 `blocks` documents and the `config/admins` document.
4. Modify `index.html`: replace static grid with dynamic rendering, add claim modal, wire up Firestore listener + transaction.
5. Build `admin.html`: sign-in flow, dashboard layout, all four actions.
6. Test end-to-end against the emulator.
7. Deploy to Firebase Hosting; configure custom domain.
8. Hand-off: brief documentation for daily admin use (sign in → confirm pending → done).

## Open questions for implementation (not blocking design approval)

- **Email regex strictness** — go with a permissive "has `@` and `.`" check, or stricter HTML5 input validation? (Lean: HTML5 default.)
- **Phone format** — display hint only, or enforce digits-only? (Lean: hint only.)
- **Pending block visual** — exact green shade for "claimed" vs current cream "pending" — to be tuned during build.
- **`config/admins` initial population** — manual in Firebase console, OR include a seed script. (Lean: manual, since it's a one-time setup with two emails.)
