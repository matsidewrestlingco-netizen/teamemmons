# Michael Crawford Jr. — Block Fundraiser Page (Design)

**Date:** 2026-05-28
**Approach:** Plan A — quick duplicate. Functional parity with Weston's existing page; visual customization deferred to a later iteration.

---

## Goal

Stand up a second Road-to-Fargo block fundraiser page for Michael Crawford Jr., reusing the existing site's structure, components, payment flow, and admin tooling. Add a parallel Firestore collection so claims for Michael are isolated from claims for Weston. No changes to Weston's live page or his `blocks` collection.

---

## Wrestler details

| Field | Value |
|---|---|
| Name | Michael Crawford Jr. |
| Weight class | 138 lbs |
| Style | Greco-Roman |
| Age group | 16U (qualifier) |
| School | Shaler Area (8th grader, going into 9th in fall 2026) |
| Club | TWC |
| Hometown | Allison Park, PA |
| Hero photo | `michael/michael.jpg` (provided — hand-raised win shot in black/blue PWC singlet) |

---

## File layout

```
/michael/
  index.html      ← clone of root index.html, content swapped, points at blocks_michael
  admin.html      ← clone of root admin.html
  admin.js        ← clone of root admin.js, collection = blocks_michael
  michael.jpg     ← hero photo (provided)
  seed.html       ← one-time admin-gated page to seed 60 docs into blocks_michael
```

Shared assets referenced via `../`:

- `../firebase-init.js`
- `../fargo.png`, `../usaw.png`, `../pausa.png`
- `../og-image.png` (reuse for now; Michael-specific OG image is a future polish item)

Weston's existing files at the root (`index.html`, `admin.html`, `admin.js`, `weston.jpg`, etc.) are **not modified**.

---

## Firestore

### New collection: `blocks_michael`

Same document schema as `blocks`:

```
blocks_michael/{1..60}
  amount: number          // matches block number
  status: "available" | "pending" | "claimed"
  donor: null | {
    firstName: string
    lastName: string
    email: string
    phone: string
    paymentMethod: "venmo" | "zelle" | "check"
    anonymous: boolean
  }
  pendingAt: timestamp    // server timestamp on claim
  claimedAt: timestamp    // server timestamp when admin confirms
```

### Rules update (`firestore.rules`)

Add a second `match` block for `blocks_michael/{blockId}` that mirrors the existing `blocks/{blockId}` rule — same `isValidPendingClaim()` helper, same admin guard. Explicit duplication chosen over wildcard matching for clarity and safety.

```
match /blocks_michael/{blockId} {
  allow read: if true;
  allow update: if isValidPendingClaim() || isAdmin();
  allow create, delete: if isAdmin();
}
```

The existing `isValidPendingClaim()` helper is collection-agnostic (it only checks document shape and field constraints), so it's reused unchanged.

The `config/admins` document and its email whitelist apply globally — no admin-config changes needed.

### Seeding

`michael/seed.html` is a one-time admin-gated page. Admin signs in with Google, clicks "Seed 60 blocks," and the page writes docs `1`–`60` to `blocks_michael` with `{ amount: n, status: "available", donor: null }`. Safe to re-run (idempotent: skips docs that already exist). After successful seed, the page is removed (or left in place since `firebase.json` hosting ignores it via wildcard if added to the ignore list).

---

## Content swaps in `/michael/index.html`

Everything below is changed relative to root `index.html`. Anything not listed here is identical.

### Meta tags
- `<title>` → "Help Send Michael to Fargo — Team Pennsylvania Wrestling"
- Meta description → "Michael Crawford Jr. qualified for the 2026 USA Wrestling 16U National Championships in Fargo, ND. Pick a block, donate the amount, send him to Nationals."
- OG `og:url` → `https://www.teamemmons.us/michael/`
- OG `og:title`, `twitter:title` → "Help Send Michael to Fargo"
- OG/Twitter descriptions → "60 blocks. Pick a number. Donate that amount. Send Michael to the 2026 USA Wrestling Nationals in Fargo, ND."
- OG `og:image`, `twitter:image` → `https://www.teamemmons.us/og-image.png` (reuse for now)

### Ticker items
Replace text-only items that mention Weston-specific facts:
- "Team Pennsylvania · 165 Greco" → "Team Pennsylvania · 138 Greco"
- "Shaler Area · Glenshaw, PA" → "Shaler Area · TWC · Allison Park, PA"

### Hero
- Title: "Help send **Michael** to Fargo" (drop "back to" — it's his first time)
- Sub-headline: "**Michael Crawford Jr.** earned a spot on the Pennsylvania National Team — Greco-Roman, **138 lbs**. 60 blocks. Pick a number, donate that amount, send him to Nationals."
- Statline:
  - Athlete → "Michael Crawford Jr."
  - Weight · Style → "138 / Greco"
  - Team → "PA 16U"
  - Grade · School → "8 / Shaler"
- Hero photo `<img src>` → `michael.jpg`, alt → "Michael Crawford Jr. having his hand raised after a Greco-Roman win"
- Photo-tag "who" small label → "On the Mat" / "Crawford"
- Photo-tag meta → "Hand raised" (keep), "Round" subtext → leave generic or remove (Weston's says "Round of 16" — we don't know Michael's match context; default to removing the round line)

### Scoreboard
- Goal stays **$1,830** (60-block math).
- Subtext under goal: "Team gear, camp, travel & lodging" (unchanged).

### Letter section
- Aside eyebrow + heading: "A note from the wrestler" / "From *Michael.*"
- Pull quote: pull a sentence from his letter — use "Fargo is the biggest tournament of the year for high school wrestlers my age — the best kids in every state are there, and only a handful from each state even **qualify.**"
- Signature mark: "— M.C."
- Signature meta:
  - **Michael Crawford Jr.**
  - Allison Park, PA · Shaler Area
  - Team Pennsylvania · 138 Greco · TWC

#### Letter body
Use Michael's letter verbatim, broken into the same `<p class="reveal">` paragraph cadence Weston's page uses. Bold the same kinds of phrases (team name, weight/style, $1,500, block math, $1,830) for visual rhythm parity.

**Editorial decisions (confirmed by user):**
- Fix typo "inportant" → "important".
- Normalize opening dates "July 8–15" → "July 13–15" (matches his own later sentence and the actual Fargo competition dates).
- Light copyedit pass for any other small typos uncovered during implementation. Voice and wording preserved.

Add the same intro line Weston's letter starts with for tonal parity, since Michael's pasted text jumps right into "This past spring…": prepend **"Hi everyone — if you're reading this, it probably means you know me or my family, and I'm asking for your help with something pretty big."** as a leading paragraph. (Optional — flag for user.)

### How it works — payment row
Vendors kept (Venmo / Zelle / Check or Cash). Values:

| Vendor | Value | Copy-button target |
|---|---|---|
| Venmo | `@drofwarcekim` | `@drofwarcekim` |
| Zelle | `412-951-5007` | `412-951-5007` |
| Check / Cash | `2716 Wooster Drive, Allison Park, PA 15101` | same |

No last-4 phone disambiguator on the Venmo line (user explicitly opted out).

### How it works — memo callout
Unchanged: still tells donors to write "Block ##" in the payment note.

### About section
Both about-cards (About Fargo, Team Pennsylvania) — keep verbatim. Generic info about the tournament and PA team, applies to both wrestlers.

### Footer
- Foot-mark / sub: unchanged ("★ Road to Fargo ★ / Thank you · The Crawford Family")
- Contact emails: **TODO — pending from family.** Leave as `mailto:TODO@example.com` placeholders with a visible note, or remove the contact line entirely until provided. Recommendation: remove for first publish, add when received.
- Fineprint about PAUSAW 501(c)(3): unchanged.

---

## JS swap in `/michael/index.html`

In the inline `<script type="module">` block:

- `collection(db, 'blocks')` → `collection(db, 'blocks_michael')`
- `doc(db, 'blocks', String(activeBlockNum))` → `doc(db, 'blocks_michael', String(activeBlockNum))`
- In `showSuccess()`, swap the three `pay-instruct` HTML blocks to use Michael's Venmo handle, Zelle phone, and check address (mirror the table above).

Everything else (modal flow, race-loss handling, IntersectionObserver, ticker, copy buttons, parallax) carries over without modification.

---

## Admin

`/michael/admin.html` + `/michael/admin.js` are clones of the root admin files with one change: every Firestore reference points at `blocks_michael` instead of `blocks`. Same Google sign-in flow, same admin email whitelist (the `config/admins` doc is shared).

Page heading copy gets a small swap to make it clear which wrestler the admin is managing (e.g., "Michael Crawford Jr. — Admin Dashboard"), so an admin who has both bookmarked doesn't confuse them.

Two admin URLs to bookmark:
- `teamemmons.us/admin.html` → Weston
- `teamemmons.us/michael/admin.html` → Michael

This is intentionally simpler than building a wrestler-switcher UI. If a third wrestler ever joins, that's the moment to consider refactoring to a shared admin.

---

## What does NOT change

- `index.html` (Weston's page) — untouched
- `admin.html`, `admin.js` (Weston's admin) — untouched
- `blocks` Firestore collection — untouched
- `config/admins` doc — untouched
- Shared assets at root — untouched
- `firebase.json` hosting config — no changes needed; `/michael/` is served automatically as part of the static site

---

## Out of scope (deferred)

- Visual differentiation between Michael's page and Weston's page (user explicitly deferred this — "we can worry about the looks down line")
- Michael-specific OG/social-share image
- Unified admin dashboard across wrestlers
- A templated/data-driven architecture for additional wrestlers (would be Plan B if a third wrestler ever comes along)

---

## Open items at spec time

1. **Family contact emails** for footer — pending from family. Page can ship without them.
2. **Whether to prepend the "Hi everyone…" intro paragraph** to Michael's letter for tonal parity with Weston's. (Editorial call — user to decide.)
3. **Photo metadata** — what to put in the photo-tag "Round" line (or whether to drop it).

None of these block implementation; each has a sensible default I'll use unless you say otherwise.
