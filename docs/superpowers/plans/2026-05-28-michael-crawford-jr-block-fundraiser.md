# Michael Crawford Jr. Block Fundraiser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a second Road-to-Fargo block fundraiser page for Michael Crawford Jr. at `/michael/`, with an isolated `blocks_michael` Firestore collection and a dedicated admin dashboard. Weston's existing page and data remain untouched.

**Architecture:** Direct duplication of the existing page structure (`index.html`, `admin.html`, `admin.js`) into a new `/michael/` subdirectory. All Firestore reads/writes for Michael's page target a new top-level collection `blocks_michael`, isolated from the existing `blocks` collection. Firestore security rules add a mirror match block for `blocks_michael`. A one-time admin-gated `seed.html` populates the 60 block docs. Shared static assets at the repo root are referenced via `../` to avoid duplication.

**Tech Stack:** Static HTML/CSS/JS, Firebase (Firestore + Auth), Firebase Hosting.

**Spec:** `docs/superpowers/specs/2026-05-28-michael-crawford-jr-block-fundraiser-design.md`

---

## File Structure

**Create:**
- `michael/index.html` — Michael's public fundraiser page (clone of root `index.html` with content/collection swaps)
- `michael/admin.html` — Michael's admin dashboard (clone of root `admin.html` with title swap)
- `michael/admin.js` — Admin script targeting `blocks_michael` (clone of root `admin.js`, collection swapped)
- `michael/michael.jpg` — Hero photo (saved from user-provided image)
- `michael/seed.html` — One-time admin-gated page that creates docs `1`–`60` in `blocks_michael`

**Modify:**
- `firestore.rules` — add mirror `match /blocks_michael/{blockId}` block

**Untouched:**
- `index.html`, `admin.html`, `admin.js`, `weston.jpg`, `firebase-init.js`, `firebase.json`, root assets

---

## Task 1: Save Michael's hero photo

**Files:**
- Create: `michael/michael.jpg`
- Source: `/Users/emmons_house/.claude/image-cache/b3780dc4-1989-4201-8327-a80d8f902a2c/1.png`

- [ ] **Step 1: Create the `michael/` directory and copy the photo**

```bash
mkdir -p michael
cp /Users/emmons_house/.claude/image-cache/b3780dc4-1989-4201-8327-a80d8f902a2c/1.png michael/michael.jpg
```

- [ ] **Step 2: Verify the file exists and has nonzero size**

```bash
ls -la michael/michael.jpg
```
Expected: file present, size > 100 KB.

- [ ] **Step 3: Commit**

```bash
git add michael/michael.jpg
git commit -m "feat(michael): add hero photo"
```

---

## Task 2: Add Firestore rules for `blocks_michael`

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Open `firestore.rules` and add a mirror match block**

After the existing `match /blocks/{blockId}` block, add an identical one for `blocks_michael`:

```
    match /blocks_michael/{blockId} {
      allow read: if true;
      allow update: if isValidPendingClaim() || isAdmin();
      allow create, delete: if isAdmin();
    }
```

The existing `isValidPendingClaim()` and `isAdmin()` helpers are reused unchanged — they're collection-agnostic.

- [ ] **Step 2: Deploy the rules**

```bash
firebase deploy --only firestore:rules
```
Expected: "✔  Deploy complete!" output. If `firebase` CLI is missing or unauthenticated, deploy from the Firebase console manually.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): mirror block-claim rules onto blocks_michael collection"
```

---

## Task 3: Build the seed page (`michael/seed.html`)

**Files:**
- Create: `michael/seed.html`

- [ ] **Step 1: Create the seed page**

This is an admin-gated, idempotent one-shot. Same Google sign-in pattern as `admin.js`. Writes docs `1`–`60` to `blocks_michael` only if they don't already exist.

Full content of `michael/seed.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seed Michael's Blocks · Admin</title>
<style>
  body{ font-family: system-ui, sans-serif; background:#0B0F1A; color:#fff; padding:40px; max-width:640px; margin:0 auto; }
  h1{ font-size:22px; margin:0 0 8px; }
  p{ color:#9fb0c8; line-height:1.6; }
  button{ background:#FFB81C; color:#0B0F1A; border:0; border-radius:6px; padding:12px 20px; font-size:14px; font-weight:700; cursor:pointer; margin-right:10px; }
  button:disabled{ opacity:.5; cursor:default; }
  .log{ background:#141a28; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:14px; margin-top:18px; font-family:"JetBrains Mono", monospace; font-size:12px; max-height:300px; overflow-y:auto; }
  .ok{ color:#7fdc9e; }
  .err{ color:#ff9aa5; }
  .skip{ color:#9fb0c8; }
</style>
</head>
<body>

<h1>Seed Michael's blocks_michael collection</h1>
<p>One-time admin tool. Creates docs <code>1</code>–<code>60</code> in the <code>blocks_michael</code> Firestore collection. Idempotent — re-running skips docs that already exist.</p>

<button id="btnSignIn">Sign in with Google</button>
<button id="btnSeed" disabled>Seed 60 blocks</button>
<button id="btnSignOut" disabled>Sign out</button>

<div class="log" id="log">Not signed in.</div>

<script type="module">
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { db, auth } from "../firebase-init.js";

const log = document.getElementById('log');
const btnSignIn = document.getElementById('btnSignIn');
const btnSeed = document.getElementById('btnSeed');
const btnSignOut = document.getElementById('btnSignOut');

function line(msg, cls){
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = msg;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

btnSignIn.onclick = async () => {
  try { await signInWithPopup(auth, provider); }
  catch(e){ line('Sign-in failed: ' + (e.message || e.code), 'err'); }
};
btnSignOut.onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  log.innerHTML = '';
  if (!user){
    line('Not signed in.');
    btnSignIn.disabled = false;
    btnSeed.disabled = true;
    btnSignOut.disabled = true;
    return;
  }
  line('Signed in as ' + user.email, 'ok');
  btnSignIn.disabled = true;
  btnSeed.disabled = false;
  btnSignOut.disabled = false;
});

btnSeed.onclick = async () => {
  btnSeed.disabled = true;
  line('Starting seed…');
  let created = 0, skipped = 0, failed = 0;
  for (let n = 1; n <= 60; n++){
    const ref = doc(db, 'blocks_michael', String(n));
    try {
      const snap = await getDoc(ref);
      if (snap.exists()){
        line('skip #' + n + ' (already exists)', 'skip');
        skipped++;
        continue;
      }
      await setDoc(ref, {
        amount: n,
        status: 'available',
        donor: null,
        pendingAt: null,
        claimedAt: null
      });
      line('created #' + n, 'ok');
      created++;
    } catch(e){
      line('FAILED #' + n + ': ' + (e.message || e.code), 'err');
      failed++;
    }
  }
  line(`Done. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`, failed > 0 ? 'err' : 'ok');
  btnSeed.disabled = false;
};
</script>
</body>
</html>
```

- [ ] **Step 2: Add `seed.html` to `firebase.json` hosting ignore so it's not deployed publicly**

Open `firebase.json`. In the `hosting.ignore` array, add `"michael/seed.html"` so it stays local-only:

```json
"ignore": [
  "firebase.json",
  ".firebaserc",
  "**/.*",
  "**/node_modules/**",
  "docs/**",
  "seed.html",
  "michael/seed.html",
  "tweaks-panel.jsx",
  "**/*.md"
],
```

- [ ] **Step 3: Run the seed locally (admin sign-in + click button)**

Start the Firebase Hosting emulator OR use any static server (e.g., `python3 -m http.server 8000`) and open `http://localhost:8000/michael/seed.html`. Sign in with an admin Google account (must be in `config/admins.emails`). Click "Seed 60 blocks." Expected log output: 60 `created #N` lines, then `Done. Created: 60, Skipped: 0, Failed: 0`.

If running against production Firestore (not emulator), this will write real docs — that's intended; Michael's collection needs to exist before the page goes live.

- [ ] **Step 4: Verify in Firestore console**

Open the Firebase console → Firestore → `blocks_michael` collection. Confirm 60 docs (`1`–`60`), each with `{ amount: n, status: "available", donor: null, pendingAt: null, claimedAt: null }`.

- [ ] **Step 5: Commit**

```bash
git add michael/seed.html firebase.json
git commit -m "feat(michael): add one-time seed page for blocks_michael"
```

---

## Task 4: Clone `index.html` to `michael/index.html`

**Files:**
- Create: `michael/index.html` (initial copy of root `index.html`)

- [ ] **Step 1: Copy the file as a starting point**

```bash
cp index.html michael/index.html
```

- [ ] **Step 2: Verify the copy**

```bash
diff index.html michael/index.html
```
Expected: no output (files identical).

- [ ] **Step 3: Commit the starting clone (separate commit so subsequent diffs are clean)**

```bash
git add michael/index.html
git commit -m "feat(michael): clone index.html as starting point"
```

---

## Task 5: Update meta tags in `michael/index.html`

**Files:**
- Modify: `michael/index.html` (head section, lines 6–24)

- [ ] **Step 1: Update `<title>` and meta description**

Replace:
```html
<title>Help Send Weston to Fargo — Team Pennsylvania Wrestling</title>
<meta name="description" content="Weston Emmons qualified for the 2026 USA Wrestling 16U & Junior National Championships in Fargo, ND. Pick a block, donate the amount, send him to Nationals.">
```
With:
```html
<title>Help Send Michael to Fargo — Team Pennsylvania Wrestling</title>
<meta name="description" content="Michael Crawford Jr. qualified for the 2026 USA Wrestling 16U National Championships in Fargo, ND. Pick a block, donate the amount, send him to Nationals.">
```

- [ ] **Step 2: Update Open Graph tags**

Replace:
```html
<meta property="og:url" content="https://www.teamemmons.us/">
<meta property="og:title" content="Help Send Weston to Fargo">
<meta property="og:description" content="60 blocks. Pick a number. Donate that amount. Send Weston to the 2026 USA Wrestling Nationals in Fargo, ND.">
<meta property="og:image" content="https://www.teamemmons.us/og-image.png">
```
With:
```html
<meta property="og:url" content="https://www.teamemmons.us/michael/">
<meta property="og:title" content="Help Send Michael to Fargo">
<meta property="og:description" content="60 blocks. Pick a number. Donate that amount. Send Michael to the 2026 USA Wrestling Nationals in Fargo, ND.">
<meta property="og:image" content="https://www.teamemmons.us/og-image.png">
```

Also update `og:image:alt`:
```html
<meta property="og:image:alt" content="Help Send Michael to Fargo — Team Pennsylvania Wrestling">
```

- [ ] **Step 3: Update Twitter Card tags**

Replace:
```html
<meta name="twitter:title" content="Help Send Weston to Fargo">
<meta name="twitter:description" content="60 blocks. Pick a number. Donate that amount. Send Weston to the 2026 USA Wrestling Nationals in Fargo, ND.">
<meta name="twitter:image" content="https://www.teamemmons.us/og-image.png">
```
With:
```html
<meta name="twitter:title" content="Help Send Michael to Fargo">
<meta name="twitter:description" content="60 blocks. Pick a number. Donate that amount. Send Michael to the 2026 USA Wrestling Nationals in Fargo, ND.">
<meta name="twitter:image" content="https://www.teamemmons.us/og-image.png">
```

(OG image and Twitter image URLs intentionally kept pointing at root `og-image.png`.)

- [ ] **Step 4: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): update meta tags for Michael's page"
```

---

## Task 6: Fix asset paths to reference root via `../`

**Files:**
- Modify: `michael/index.html` (sanctions, photo, about cards)

The cloned file references shared images by relative path (e.g., `usaw.png`, `fargo.png`). Since this file now lives in `michael/`, those need to become `../usaw.png`, etc.

- [ ] **Step 1: Update sanctioning bar logos**

Replace:
```html
<img src="usaw.png" alt="USA Wrestling">
<span class="sep">+</span>
<img src="pausa.png" alt="Pennsylvania USA Wrestling">
<span class="sep">+</span>
<img src="fargo.png" alt="2026 Junior Nationals · Fargo" class="tall">
```
With:
```html
<img src="../usaw.png" alt="USA Wrestling">
<span class="sep">+</span>
<img src="../pausa.png" alt="Pennsylvania USA Wrestling">
<span class="sep">+</span>
<img src="../fargo.png" alt="2026 16U Nationals · Fargo" class="tall">
```

- [ ] **Step 2: Update Fargo stamp on hero photo**

Replace:
```html
<div class="fargo-stamp" aria-hidden="true"><img src="fargo.png" alt=""></div>
```
With:
```html
<div class="fargo-stamp" aria-hidden="true"><img src="../fargo.png" alt=""></div>
```

- [ ] **Step 3: Update hero photo `<img>`**

Replace:
```html
<img src="weston.jpg" alt="Weston Emmons celebrating a win in his Team Pennsylvania singlet">
```
With:
```html
<img src="michael.jpg" alt="Michael Crawford Jr. having his hand raised after a Greco-Roman win">
```

(No `../` here — `michael.jpg` lives next to this file.)

- [ ] **Step 4: Update about-card badge images**

Replace:
```html
<span class="card-badge"><img src="fargo.png" alt="2026 Junior Nationals Fargo" style="height:64px"></span>
```
With:
```html
<span class="card-badge"><img src="../fargo.png" alt="2026 16U Nationals Fargo" style="height:64px"></span>
```

And:
```html
<span class="card-badge"><img src="pausa.png" alt="Pennsylvania USA Wrestling"></span>
```
With:
```html
<span class="card-badge"><img src="../pausa.png" alt="Pennsylvania USA Wrestling"></span>
```

- [ ] **Step 5: Verify no remaining bare image refs**

```bash
grep -nE 'src="(usaw|pausa|fargo|weston)\.' michael/index.html
```
Expected: no output (no bare root-relative refs left).

- [ ] **Step 6: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): repath shared assets to parent, swap hero to michael.jpg"
```

---

## Task 7: Update the ticker

**Files:**
- Modify: `michael/index.html` (script block, around line 1741)

- [ ] **Step 1: Swap ticker items**

Find the `tickerItems` array and replace:

```javascript
const tickerItems = [
  "★ Road to Fargo 2026",
  "60 blocks · $1,830 goal",
  "Team Pennsylvania · 165 Greco",
  "July 13–15 · Fargo, ND",
  "Pick a number · Send a few bucks",
  "★ Every block matters",
  "Shaler Area · Glenshaw, PA"
];
```
With:
```javascript
const tickerItems = [
  "★ Road to Fargo 2026",
  "60 blocks · $1,830 goal",
  "Team Pennsylvania · 138 Greco",
  "July 13–15 · Fargo, ND",
  "Pick a number · Send a few bucks",
  "★ Every block matters",
  "Shaler Area · TWC · Allison Park, PA"
];
```

- [ ] **Step 2: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): swap ticker copy"
```

---

## Task 8: Update the hero section

**Files:**
- Modify: `michael/index.html` (around lines 1453–1517)

- [ ] **Step 1: Update kicker pill**

The eyebrow says "USA Wrestling · 2026 Nationals" — keep as-is. The pill says "Fargo, ND · July 13–15" — keep as-is.

- [ ] **Step 2: Update hero title**

Replace:
```html
<h1 class="title display reveal delay-1">
  <span class="stack"><span class="small">Help send</span></span>
  Weston
  <span class="stack"><span class="gold">back to Fargo</span></span>
</h1>
```
With:
```html
<h1 class="title display reveal delay-1">
  <span class="stack"><span class="small">Help send</span></span>
  Michael
  <span class="stack"><span class="gold">to Fargo</span></span>
</h1>
```

(Drop "back" — it's his first Fargo trip.)

- [ ] **Step 3: Update hero sub-headline**

Replace:
```html
<p class="sub reveal delay-2">
  <strong>Weston Emmons</strong> earned a spot on the Pennsylvania National Team — Greco-Roman, 165 lbs.
  60 blocks. Pick a number, donate that amount, send him to Nationals.
</p>
```
With:
```html
<p class="sub reveal delay-2">
  <strong>Michael Crawford Jr.</strong> earned a spot on the Pennsylvania National Team — Greco-Roman, 138 lbs.
  60 blocks. Pick a number, donate that amount, send him to Nationals.
</p>
```

- [ ] **Step 4: Update CTA button — change "Read Weston's letter" to "Read Michael's letter"**

Replace:
```html
<a href="#letter" class="btn btn-ghost">Read Weston's letter</a>
```
With:
```html
<a href="#letter" class="btn btn-ghost">Read Michael's letter</a>
```

- [ ] **Step 5: Update the statline**

Replace the four `<div class="stat">` blocks:
```html
<div class="stat">
  <div class="label">Athlete</div>
  <div class="value">Weston Emmons</div>
</div>
<div class="stat">
  <div class="label">Weight · Style</div>
  <div class="value">165 <span class="accent">/</span> Greco</div>
</div>
<div class="stat">
  <div class="label">Team</div>
  <div class="value">PA Juniors</div>
</div>
<div class="stat">
  <div class="label">Grade · School</div>
  <div class="value">10 <span class="accent">/</span> Shaler</div>
</div>
```
With:
```html
<div class="stat">
  <div class="label">Athlete</div>
  <div class="value">Michael Crawford Jr.</div>
</div>
<div class="stat">
  <div class="label">Weight · Style</div>
  <div class="value">138 <span class="accent">/</span> Greco</div>
</div>
<div class="stat">
  <div class="label">Team</div>
  <div class="value">PA 16U</div>
</div>
<div class="stat">
  <div class="label">Grade · School</div>
  <div class="value">8 <span class="accent">/</span> Shaler</div>
</div>
```

- [ ] **Step 6: Drop the photo-tag "Round" line**

Replace:
```html
<div class="photo-tag">
  <div class="who">
    <small>On the Mat</small>
    Emmons
  </div>
  <div class="meta">
    Hand raised<br>
    Round of 16
  </div>
</div>
```
With:
```html
<div class="photo-tag">
  <div class="who">
    <small>On the Mat</small>
    Crawford
  </div>
  <div class="meta">
    Hand raised
  </div>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): swap hero copy for Michael"
```

---

## Task 9: Update the letter section

**Files:**
- Modify: `michael/index.html` (around lines 1542–1568)

- [ ] **Step 1: Update the letter aside (left column)**

Replace:
```html
<aside class="letter-aside">
  <div class="eyebrow dark">A note from the wrestler</div>
  <h2 class="reveal">From <em>Weston.</em></h2>
  <div class="pull reveal delay-1">
    "Fargo is the biggest tournament of the year for wrestlers my age — and only a handful from each state even <span>qualify.</span>"
  </div>
  <div class="signature reveal delay-2">
    <div class="sig-mark">— W.E.</div>
    <div class="sig-meta">
      <b>Weston Emmons</b><br>
      Glenshaw, PA · Shaler Area HS<br>
      Team Pennsylvania · 165 Greco
    </div>
  </div>
</aside>
```
With:
```html
<aside class="letter-aside">
  <div class="eyebrow dark">A note from the wrestler</div>
  <h2 class="reveal">From <em>Michael.</em></h2>
  <div class="pull reveal delay-1">
    "Fargo is the biggest tournament of the year for high school wrestlers my age — the best kids in every state are there, and only a handful from each state even <span>qualify.</span>"
  </div>
  <div class="signature reveal delay-2">
    <div class="sig-mark">— M.C.</div>
    <div class="sig-meta">
      <b>Michael Crawford Jr.</b><br>
      Allison Park, PA · Shaler Area<br>
      Team Pennsylvania · 138 Greco · TWC
    </div>
  </div>
</aside>
```

- [ ] **Step 2: Replace the letter body paragraphs**

Replace the full `<div class="letter-body">` contents (Weston's six `<p>` blocks):

```html
<div class="letter-body">
  <p class="reveal">Hi everyone — if you're reading this, it probably means you know me, my mom, or my dad, and I'm asking for your help with something pretty big.</p>
  <p class="reveal delay-1">This past spring I earned a spot on the <strong>Pennsylvania National Team for Greco-Roman wrestling</strong>, which means I get to compete at the <strong>16U &amp; Junior National Championships in Fargo, North Dakota</strong> this July. Fargo is the biggest tournament of the year for wrestlers my age — the best kids in every state are there, and only a handful from each state even qualify.</p>
  <p class="reveal delay-1">This will actually be <strong>my second trip to Fargo</strong>, and that's part of why it matters so much this time. I'm a 10th grader at Shaler Area, which means college decisions aren't that far off — and Fargo is one of the biggest scouting events of the year. College coaches from all over the country are in the stands watching every match. A strong showing here could open doors that don't open anywhere else.</p>
  <p class="reveal delay-2">Before Fargo, Team PA has a training camp at Penn West Clarion (July 5–7), then we travel together to North Dakota and compete July 13–15. Between team gear, camp, travel, lodging, and entry fees, the total cost is around <strong>$1,500</strong>. That's a lot for my family to cover on top of everything else they already do for my wrestling, so I'm trying to raise as much as I can on my own.</p>
  <p class="reveal delay-2">Here's the fun part — I'm doing a <strong>"block" fundraiser</strong>. There are 60 blocks below, numbered 1 through 60. <strong>You pick a block, you donate that dollar amount.</strong> Block 5 = $5. Block 42 = $42. Block 60 = $60. Pick whatever number speaks to you (lucky number, jersey number, birthday, whatever). When every block is claimed, I'll have raised <strong>$1,830</strong> — enough for the trip plus a little cushion.</p>
  <p class="reveal delay-3">Every single block matters to me. Whether you can take #3 or #58, I'll be grateful, and I'll remember it. Thank you for believing in me, and for being part of getting me back to Fargo.</p>
</div>
```
With Michael's letter (verbatim, with the two confirmed editorial fixes — "important" spelling, and normalized July 13–15):

```html
<div class="letter-body">
  <p class="reveal">This past spring I earned a spot on the <strong>Pennsylvania National Team for Greco-Roman wrestling</strong>, which means I get to compete at the <strong>High School National Championships as a 16U qualifier in Fargo, North Dakota July 13–15</strong>. Fargo is the biggest tournament of the year for high school wrestlers my age — the best kids in every state are there, and only a handful from each state even qualify for it which is why I am so excited having earned a spot.</p>
  <p class="reveal delay-1">This will be my <strong>first time qualifying</strong> for the trip to Fargo, and I know it is going to be among the most incredible experiences I have ever had in my life. I'm currently an 8th grader at Shaler Area, and will begin my Freshman year in HS in the fall.</p>
  <p class="reveal delay-2">Before Fargo, Team PA has a training camp at Penn West Clarion (July 5–7), then we travel together as a team to North Dakota and compete July 13–15. Between team gear, camp, travel, room/board, and entry fees, the total cost is around <strong>$1,500</strong>. That's a lot for my family to cover on top of everything else they already do for my wrestling, so I'm trying to raise as much as I can on my own.</p>
  <p class="reveal delay-2">A close friend and Shaler/PA teammate helped me set up a fun <strong>"block" fundraiser</strong> to get me started. There are 60 blocks below, numbered 1 through 60. <strong>You pick a block, you donate that dollar amount.</strong> Block 5 = $5. Block 42 = $42. Block 60 = $60. Pick whatever number speaks to you (lucky number, jersey number, birthday, whatever). When every block is claimed, I'll have raised <strong>$1,830</strong> — enough for the trip plus a little cushion.</p>
  <p class="reveal delay-3">Every single block matters to me. Whether you can take #3 or #58, I'll be extremely grateful, and I'll remember it. Thank you for believing in me, and for being such an important part of this experience to represent myself, my school, and my city and community on the National Stage!!!!!</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): add Michael's letter content"
```

---

## Task 10: Update payment info ("How it works")

**Files:**
- Modify: `michael/index.html` (around lines 1585–1605)

- [ ] **Step 1: Update the payment row**

Replace:
```html
<div class="pay-row">
  <div class="pay"><b>Venmo</b><code>@Celia-Emmons (Last 4 digits of phone: 9890)</code><button class="copy-btn" data-copy="@Celia-Emmons">Copy</button></div>
  <div class="pay"><b>Zelle</b><code>937-654-9895</code><button class="copy-btn" data-copy="937-654-9895">Copy</button></div>
  <div class="pay"><b>Check</b><code>2409 E Springwood Dr, Glenshaw, PA 15116</code><button class="copy-btn" data-copy="2409 E Springwood Dr, Glenshaw, PA 15116">Copy</button></div>
</div>
```
With:
```html
<div class="pay-row">
  <div class="pay"><b>Venmo</b><code>@drofwarcekim</code><button class="copy-btn" data-copy="@drofwarcekim">Copy</button></div>
  <div class="pay"><b>Zelle</b><code>412-951-5007</code><button class="copy-btn" data-copy="412-951-5007">Copy</button></div>
  <div class="pay"><b>Check</b><code>2716 Wooster Drive, Allison Park, PA 15101</code><button class="copy-btn" data-copy="2716 Wooster Drive, Allison Park, PA 15101">Copy</button></div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): wire Michael's payment info into How It Works"
```

---

## Task 11: Update payment instructions in the success modal (JS)

**Files:**
- Modify: `michael/index.html` (script block, `showSuccess` function, around lines 1970–1996)

- [ ] **Step 1: Replace the three `pay-instruct` branches**

Replace:
```javascript
if (method === 'venmo'){
  payInstruct.innerHTML = `
    Send <b>$${activeBlockNum}</b> on <b>Venmo</b> to:
    <div class="copyrow"><b>@Celia-Emmons (Last 4 digits of phone: 9890)</b>
      <button type="button" class="copy-btn" data-copy="@Celia-Emmons">Copy</button>
    </div>
    Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
} else if (method === 'zelle'){
  payInstruct.innerHTML = `
    Send <b>$${activeBlockNum}</b> on <b>Zelle</b> to:
    <div class="copyrow"><b>937-654-9895</b>
      <button type="button" class="copy-btn" data-copy="937-654-9895">Copy</button>
    </div>
    Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
} else {
  payInstruct.innerHTML = `
    Mail a <b>check</b> for <b>$${activeBlockNum}</b> (or drop off cash) to:
    <div class="copyrow"><b>2409 E Springwood Dr, Glenshaw, PA 15116</b>
      <button type="button" class="copy-btn" data-copy="2409 E Springwood Dr, Glenshaw, PA 15116">Copy</button>
    </div>
    Please write <b>"Block #${activeBlockNum}"</b> in the memo line.`;
}
```
With:
```javascript
if (method === 'venmo'){
  payInstruct.innerHTML = `
    Send <b>$${activeBlockNum}</b> on <b>Venmo</b> to:
    <div class="copyrow"><b>@drofwarcekim</b>
      <button type="button" class="copy-btn" data-copy="@drofwarcekim">Copy</button>
    </div>
    Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
} else if (method === 'zelle'){
  payInstruct.innerHTML = `
    Send <b>$${activeBlockNum}</b> on <b>Zelle</b> to:
    <div class="copyrow"><b>412-951-5007</b>
      <button type="button" class="copy-btn" data-copy="412-951-5007">Copy</button>
    </div>
    Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
} else {
  payInstruct.innerHTML = `
    Mail a <b>check</b> for <b>$${activeBlockNum}</b> (or drop off cash) to:
    <div class="copyrow"><b>2716 Wooster Drive, Allison Park, PA 15101</b>
      <button type="button" class="copy-btn" data-copy="2716 Wooster Drive, Allison Park, PA 15101">Copy</button>
    </div>
    Please write <b>"Block #${activeBlockNum}"</b> in the memo line.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): wire Michael's payment info into success modal"
```

---

## Task 12: Update the all-claimed banner

**Files:**
- Modify: `michael/index.html` (script block, around line 1829)

- [ ] **Step 1: Replace banner text**

Replace:
```javascript
banner.textContent = '🎉 We did it — Weston is going to Fargo. Thank you.';
```
With:
```javascript
banner.textContent = '🎉 We did it — Michael is going to Fargo. Thank you.';
```

- [ ] **Step 2: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): swap all-claimed banner name"
```

---

## Task 13: Update the footer

**Files:**
- Modify: `michael/index.html` (around lines 1663–1673)

- [ ] **Step 1: Update foot-sub and contact**

Replace:
```html
<div class="foot-sub">Thank you · The Emmons Family</div>
<div class="foot-contact">
  Questions? Reach out:<br>
  <a href="mailto:daniel.emmons@gmail.com">daniel.emmons@gmail.com</a> &nbsp;·&nbsp;
  <a href="mailto:celiaremmons@gmail.com">celiaremmons@gmail.com</a>
</div>
```
With:
```html
<div class="foot-sub">Thank you · The Crawford Family</div>
<div class="foot-contact">
  Questions? Reach out:<br>
  <a href="mailto:crawmk@yahoo.com">crawmk@yahoo.com</a>
</div>
```

Fineprint (PAUSAW 501(c)(3) note): keep verbatim — the only wrestler-specific bit is "Weston's name" → replace with "Michael's name":

Replace:
```html
<div class="fineprint">
  Prefer to give tax-deductible? Pennsylvania USA Wrestling is a 501(c)(3) (EIN 83-4224221) and can issue an invoice payable directly to PAUSAW with Weston's name on it. Email us and we'll send the link.
</div>
```
With:
```html
<div class="fineprint">
  Prefer to give tax-deductible? Pennsylvania USA Wrestling is a 501(c)(3) (EIN 83-4224221) and can issue an invoice payable directly to PAUSAW with Michael's name on it. Email us and we'll send the link.
</div>
```

- [ ] **Step 2: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): update footer contact and tax-receipt name"
```

---

## Task 14: Repath `firebase-init.js` import + swap Firestore collection

**Files:**
- Modify: `michael/index.html` (script block, around lines 1734–1738 and 1842, 1943)

- [ ] **Step 1: Fix the `firebase-init.js` import path**

Replace:
```javascript
import { db } from "./firebase-init.js";
```
With:
```javascript
import { db } from "../firebase-init.js";
```

- [ ] **Step 2: Swap the `onSnapshot` collection reference**

Replace:
```javascript
onSnapshot(collection(db, 'blocks'), (snap) => {
```
With:
```javascript
onSnapshot(collection(db, 'blocks_michael'), (snap) => {
```

- [ ] **Step 3: Swap the `doc()` reference in the claim transaction**

Replace:
```javascript
const blockRef = doc(db, 'blocks', String(activeBlockNum));
```
With:
```javascript
const blockRef = doc(db, 'blocks_michael', String(activeBlockNum));
```

- [ ] **Step 4: Verify no remaining `'blocks'` references**

```bash
grep -n "'blocks'" michael/index.html
```
Expected: no output (only `'blocks_michael'` remains).

- [ ] **Step 5: Commit**

```bash
git add michael/index.html
git commit -m "feat(michael): point page at blocks_michael collection and repath firebase-init"
```

---

## Task 15: Smoke-test `michael/index.html` in a browser

**Files:** none modified

- [ ] **Step 1: Start a local static server**

```bash
python3 -m http.server 8000
```

- [ ] **Step 2: Open `http://localhost:8000/michael/` in a browser**

Visual checks:
1. Hero shows Michael's photo, "Michael Crawford Jr.", "138 / Greco", "PA 16U", "8 / Shaler"
2. Ticker scrolls with "138 Greco" + "Allison Park" items
3. Letter is Michael's text, signature shows "— M.C." and "Allison Park, PA · Shaler Area"
4. How-it-works payment row shows `@drofwarcekim`, `412-951-5007`, `2716 Wooster Drive, Allison Park, PA 15101`
5. Block grid renders **60 available blocks** (proves `blocks_michael` collection is live and seeded)
6. Click block #5 → modal opens with "Block 5 · $5" → fill out form with test data → submit → success view shows correct payment instructions for the chosen method
7. Browser console: no 404s for images (verify `usaw.png`, `pausa.png`, `fargo.png`, `michael.jpg` all load)
8. Footer shows "The Crawford Family" and `crawmk@yahoo.com`

- [ ] **Step 3: Open Weston's page (`http://localhost:8000/`) and verify unaffected**

Weston's hero, letter, payment info, and block grid should be identical to before. Block claims on Weston's page should still go to the `blocks` collection (not `blocks_michael`).

- [ ] **Step 4: Clean up the test claim**

If Step 2 created a test pending claim on Michael's collection, sign into `michael/admin.html` (after Task 16 below) and release block #5, or release it via Firebase console.

---

## Task 16: Clone `admin.html` to `michael/admin.html`

**Files:**
- Create: `michael/admin.html`

- [ ] **Step 1: Copy as starting point**

```bash
cp admin.html michael/admin.html
```

- [ ] **Step 2: Update `<title>`**

Replace:
```html
<title>Road to Fargo · Admin</title>
```
With:
```html
<title>Road to Fargo · Michael — Admin</title>
```

- [ ] **Step 3: Update header brand and sign-in heading to distinguish Michael's admin**

Replace:
```html
<div class="brand"><span class="red">★</span> Road <span class="gold">to</span> Fargo · Admin</div>
```
With:
```html
<div class="brand"><span class="red">★</span> Road <span class="gold">to</span> Fargo · <span style="color:#9fb0c8">Michael</span> Admin</div>
```

And:
```html
<h1><span class="red">★</span> Admin <span class="gold">Login</span></h1>
```
With:
```html
<h1><span class="red">★</span> Michael <span class="gold">Admin</span></h1>
```

- [ ] **Step 4: Update the `<script>` import path (admin.js lives next to this file, no path change needed, but verify)**

The line `<script type="module" src="./admin.js"></script>` is correct as-is — `michael/admin.js` will live next to `michael/admin.html` (created in Task 17).

- [ ] **Step 5: Commit**

```bash
git add michael/admin.html
git commit -m "feat(michael): clone admin.html with Michael-labeled title and header"
```

---

## Task 17: Clone `admin.js` to `michael/admin.js` and swap collection

**Files:**
- Create: `michael/admin.js`

- [ ] **Step 1: Copy as starting point**

```bash
cp admin.js michael/admin.js
```

- [ ] **Step 2: Update `firebase-init.js` import path**

Replace:
```javascript
import { db, auth } from "./firebase-init.js";
```
With:
```javascript
import { db, auth } from "../firebase-init.js";
```

- [ ] **Step 3: Replace all `'blocks'` collection references with `'blocks_michael'`**

There are 5 references in `admin.js` to swap (all string literals `'blocks'`):
- `onSnapshot(collection(db, 'blocks'), ...)` in `startListening()`
- `updateDoc(doc(db, 'blocks', String(n)), ...)` in `confirmBlock()`
- `setDoc(doc(db, 'blocks', String(n)), ...)` in `releaseBlock()`
- `setDoc(doc(db, 'blocks', String(n)), ...)` in `openManualClaimModal()`
- `updateDoc(doc(db, 'blocks', String(n)), ...)` in `openEditModal()`

Use a single sed pass to swap all five:

```bash
# Verify count first
grep -c "'blocks'" michael/admin.js
# Expected: 5

# Apply the swap
sed -i.bak "s/'blocks'/'blocks_michael'/g" michael/admin.js
rm michael/admin.js.bak

# Verify
grep -c "'blocks_michael'" michael/admin.js
# Expected: 5
grep -c "'blocks'" michael/admin.js
# Expected: 0
```

- [ ] **Step 4: Commit**

```bash
git add michael/admin.js
git commit -m "feat(michael): clone admin.js targeting blocks_michael collection"
```

---

## Task 18: Smoke-test `michael/admin.html`

**Files:** none modified

- [ ] **Step 1: With local server still running, open `http://localhost:8000/michael/admin.html`**

- [ ] **Step 2: Sign in with an admin Google account**

(Must be an email present in the `config/admins.emails` Firestore doc.)

- [ ] **Step 3: Verify dashboard loads with Michael's data**

- Header reads "Michael Admin"
- Stats reflect `blocks_michael`: Raised $0, Claimed 0/60, Pending 0 (or 1 if Task 15 Step 4 left a test claim), Left to goal $1,830
- "All blocks" grid shows 60 cells, all gray (available) or one yellow (pending) if test claim still present

- [ ] **Step 4: Release any leftover test claim**

Click the pending block → "Release" → confirm. Verify the block flips back to available and pending count drops to 0.

- [ ] **Step 5: Verify isolation from Weston's admin**

Open `http://localhost:8000/admin.html` in another tab. Weston's stats/grid should be completely independent of Michael's. Changes in one admin should not affect the other.

---

## Task 19: Deploy

**Files:** none modified

- [ ] **Step 1: Re-verify the spec checklist is satisfied**

Open `docs/superpowers/specs/2026-05-28-michael-crawford-jr-block-fundraiser-design.md` side-by-side. Every "Content swap" item in the spec should be applied.

- [ ] **Step 2: Deploy to Firebase Hosting**

```bash
firebase deploy --only hosting
```

Expected: "Deploy complete!" and the hosting URL. `seed.html` should NOT appear in the upload list (ignored via firebase.json).

- [ ] **Step 3: Visit the live site**

- `https://www.teamemmons.us/michael/` — Michael's public page
- `https://www.teamemmons.us/michael/admin.html` — Michael's admin
- `https://www.teamemmons.us/` — Weston's page (verify still works)
- `https://www.teamemmons.us/admin.html` — Weston's admin (verify still works)

- [ ] **Step 4: Test an end-to-end claim on production**

On `/michael/`, click any available block, fill in the form with real test data (your own name/email), pick Venmo, submit. Verify:
- The block flips to pending (yellow) on Michael's grid
- Weston's `/` grid is unchanged
- The success modal shows `@drofwarcekim` and the correct amount

Then sign into `/michael/admin.html`, find the pending claim, click "Release" to put it back to available.

---

## Self-Review

**Spec coverage check:** Each spec section maps to:
- File layout → Tasks 1, 3, 4, 16, 17
- Firestore collection + rules → Tasks 2, 3
- Meta tags → Task 5
- Ticker items → Task 7
- Hero (title, sub, statline, photo) → Tasks 6, 8
- Scoreboard → unchanged (no task needed)
- Letter section → Task 9
- How-it-works payment row → Task 10
- About section → unchanged (no task needed)
- Footer → Task 13
- JS swap (collection + payment instructions + banner + firebase import path) → Tasks 11, 12, 14
- Admin → Tasks 16, 17
- Smoke testing → Tasks 15, 18
- Deploy → Task 19

**Placeholder scan:** No `TBD`/`TODO`/"fill in" anywhere. All editorial decisions (typo fix, date normalization) are baked into the task text directly.

**Type/path consistency:** Collection name `blocks_michael` consistent across rules, seed page, index.html, and admin.js. Photo filename `michael.jpg` consistent. Asset `../` prefix consistent for shared root images.

**Ready to execute.**
