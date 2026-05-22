# Firebase Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Firebase backend and admin dashboard to the Road to Fargo block fundraiser, so donors can self-reserve a block (pending) and the admin can manually confirm payment (claimed) — with live real-time updates between visitors.

**Architecture:** Vanilla HTML/CSS/JS hosted on Firebase Hosting. One Firestore collection (`blocks`) with 60 documents. Public `index.html` renders the grid from live Firestore data and writes a "pending" claim through a transaction. New `admin.html`, gated by Google sign-in + an email whitelist, lets the admin confirm payment, release, edit, or manually claim. No build step, no framework.

**Tech Stack:** Firebase Hosting · Cloud Firestore · Firebase Authentication (Google provider) · Firebase JS SDK v11 (loaded from CDN as ES modules) · Firebase CLI for deployment.

**Reference:** `docs/superpowers/specs/2026-05-21-firebase-blocks-design.md`

---

## Phase 1: Firebase Project Setup (manual, in the browser)

> These steps happen in the Firebase Console — no code yet. They produce a `firebaseConfig` object that gets pasted into the HTML files in Phase 4.

### Task 1: Create the Firebase project

- [ ] **Step 1: Open the Firebase Console**

Go to https://console.firebase.google.com/ and sign in with the Google account that should own the project (recommend: `daniel.emmons@gmail.com` since the domain is likely registered there).

- [ ] **Step 2: Create a new project**

Click **"Add project"**. Name it **`road-to-fargo`** (or similar). Disable Google Analytics when prompted (not needed). Click **Create project** and wait for setup to finish.

- [ ] **Step 3: Note the project ID**

After the project is created, click the ⚙️ gear → **Project settings**. Copy the **Project ID** (e.g. `road-to-fargo-a1b2c`) — you'll need it for `.firebaserc` later.

### Task 2: Enable Cloud Firestore

- [ ] **Step 1: Open Firestore**

In the left sidebar of the Firebase Console, click **Build → Firestore Database**. Click **Create database**.

- [ ] **Step 2: Pick mode and location**

- Mode: **Production mode** (we'll write our own rules; do not pick test mode).
- Location: pick the region closest to you (e.g. `nam5` for North America).

Click **Enable**.

- [ ] **Step 3: Verify**

You should land on an empty Firestore database view. Leave this tab open — you'll come back in Task 9.

### Task 3: Enable Google Authentication

- [ ] **Step 1: Open Authentication**

Left sidebar → **Build → Authentication** → **Get started**.

- [ ] **Step 2: Enable the Google provider**

Sign-in method tab → click **Google** → toggle **Enable** → set the support email to the project owner's Gmail → **Save**.

- [ ] **Step 3: Verify**

Under the Sign-in method table, Google should show **Enabled**.

### Task 4: Register a Web App and copy the config

- [ ] **Step 1: Add a web app**

⚙️ Project settings → **Your apps** section → click the `</>` (Web) icon. Nickname: **"Road to Fargo Web"**. **Do not** check "Also set up Firebase Hosting" here — we'll do that from the CLI. Click **Register app**.

- [ ] **Step 2: Copy the Firebase config object**

The next screen shows a snippet like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "road-to-fargo-a1b2c.firebaseapp.com",
  projectId: "road-to-fargo-a1b2c",
  storageBucket: "road-to-fargo-a1b2c.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

**Save these values somewhere safe** — you'll paste them into `index.html`, `admin.html`, and `seed.html` later.

It's fine that these values are public; they identify your project, not authorize access. Security rules + your admin email whitelist are what actually protect the data.

- [ ] **Step 3: Continue past the SDK setup screen**

Click **Continue to console**. Phase 1 is done.

---

## Phase 2: Local Project Files (Firebase CLI + config)

### Task 5: Install Node.js and the Firebase CLI

- [ ] **Step 1: Check if you already have Node.js**

In Terminal:

```bash
node --version
```

If you see a version (e.g. `v20.10.0`), skip to Step 3. Otherwise:

- [ ] **Step 2: Install Node.js**

Go to https://nodejs.org/ and download the **LTS** installer for macOS. Run it. Verify with `node --version` again.

- [ ] **Step 3: Install the Firebase CLI globally**

```bash
npm install -g firebase-tools
```

Verify:

```bash
firebase --version
```

You should see something like `13.x.x` (or later — anything 13+ works).

- [ ] **Step 4: Log in**

```bash
firebase login
```

A browser tab opens. Sign in with the same Google account that owns the Firebase project.

### Task 6: Initialize Firebase in the project directory

- [ ] **Step 1: Switch to the project directory**

```bash
cd /Users/emmons_house/Desktop/teamemmons
```

- [ ] **Step 2: Run firebase init**

```bash
firebase init
```

When prompted:
- "Which Firebase features?" → use Space to select **Firestore** AND **Hosting** AND **Emulators** → press Enter
- "Please select an option" → **Use an existing project** → pick the `road-to-fargo` project
- Firestore rules file: accept default `firestore.rules`
- Firestore indexes file: accept default `firestore.indexes.json`
- Public directory: type `.` (a single dot — we want the project root as the public dir)
- Configure as single-page app: **No**
- Set up automatic builds and deploys with GitHub: **No**
- File `./index.html` already exists. Overwrite? **No** (KEEP your existing file)
- Emulators to set up: **Authentication Emulator** AND **Firestore Emulator** AND **Hosting Emulator**
- Accept default ports for everything
- Download emulators now? **Yes**

- [ ] **Step 3: Inspect the generated files**

You should now have new files: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`.

### Task 7: Configure `firebase.json` for hosting

- [ ] **Step 1: Open `firebase.json` and replace the entire contents**

Path: `/Users/emmons_house/Desktop/teamemmons/firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      ".firebaserc",
      "**/.*",
      "**/node_modules/**",
      "docs/**",
      "seed.html",
      "tweaks-panel.jsx",
      "**/*.md"
    ],
    "headers": [
      {
        "source": "**/*.@(html|js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache" }
        ]
      },
      {
        "source": "**/*.@(png|jpg|jpeg|svg|webp)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=86400" }
        ]
      }
    ]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true }
  }
}
```

The `ignore` list keeps `docs/`, `seed.html`, and the unrelated `tweaks-panel.jsx` out of production deploys.

### Task 8: Write the Firestore security rules

- [ ] **Step 1: Replace the entire contents of `firestore.rules`**

Path: `/Users/emmons_house/Desktop/teamemmons/firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in get(/databases/$(database)/documents/config/admins).data.emails;
    }

    function isValidPendingClaim() {
      let inc = request.resource.data;
      let cur = resource.data;
      return cur.status == "available"
        && inc.status == "pending"
        && inc.amount == cur.amount
        && inc.donor.firstName is string && inc.donor.firstName.size() > 0 && inc.donor.firstName.size() < 60
        && inc.donor.lastName  is string && inc.donor.lastName.size() > 0  && inc.donor.lastName.size()  < 60
        && inc.donor.email     is string && inc.donor.email.matches(".+@.+\\..+") && inc.donor.email.size() < 120
        && inc.donor.phone     is string && inc.donor.phone.size() > 0 && inc.donor.phone.size() < 40
        && inc.donor.paymentMethod in ["venmo", "zelle"]
        && inc.donor.anonymous is bool
        && inc.pendingAt == request.time;
    }

    match /blocks/{blockId} {
      allow read: if true;
      allow update: if isValidPendingClaim() || isAdmin();
      allow create, delete: if isAdmin();
    }

    match /config/{docId} {
      allow read: if isAdmin();
      allow write: if false; // edit only via Firebase Console
    }
  }
}
```

- [ ] **Step 2: Manual verification**

These rules will be exercised against the emulator in Phase 6 (Task 21). For now just save the file.

### Task 9: (Optional) Initialize a git repo

- [ ] **Step 1: Init and create a .gitignore**

If you want commit history (recommended), in the project root:

```bash
git init
```

Create a file `.gitignore` with these contents:

```
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log
*.log
.DS_Store
node_modules/
```

Then:

```bash
git add .
git commit -m "chore: initial commit (pre-firebase)"
```

If you skip this task, the subsequent "Commit" steps can be ignored.

---

## Phase 3: Seed Database

### Task 10: Create the admin whitelist document

- [ ] **Step 1: Open Firestore in the Firebase Console**

https://console.firebase.google.com/ → your project → Firestore Database.

- [ ] **Step 2: Create the `config/admins` document manually**

- Click **Start collection** → Collection ID: `config` → Next.
- Document ID: `admins`.
- Add field: name `emails`, type `array`, then add string entries — one per admin Gmail. For example:
  - `daniel.emmons@gmail.com`
  - `celiaremmons@gmail.com`
- Click **Save**.

- [ ] **Step 3: Verify**

You should see `config/admins` with an `emails` array containing both addresses.

### Task 11: Create the one-time seed page

- [ ] **Step 1: Create `seed.html`**

Path: `/Users/emmons_house/Desktop/teamemmons/seed.html`

> Replace the `firebaseConfig` placeholder with your actual values from Task 4 Step 2.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Seed Blocks · one-time</title>
<style>
  body{ font-family:system-ui, sans-serif; max-width:640px; margin:40px auto; padding:0 20px; line-height:1.5; }
  button{ font-size:16px; padding:12px 20px; background:#0B0F1A; color:#fff; border:0; border-radius:6px; cursor:pointer; }
  button:disabled{ opacity:.5; cursor:default; }
  pre{ background:#f3f1ea; padding:12px; border-radius:6px; white-space:pre-wrap; }
  .ok{ color:#0a7d2c; } .err{ color:#a40e1f; }
</style>
</head>
<body>
<h1>Seed Blocks</h1>
<p>This page creates 60 block documents in Firestore. Run it <strong>once</strong>, then delete this file.</p>
<p>If a block document already exists it is left alone (idempotent).</p>
<button id="run">Seed 60 blocks</button>
<pre id="log"></pre>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PASTE_FROM_TASK_4",
  authDomain: "PASTE_FROM_TASK_4",
  projectId: "PASTE_FROM_TASK_4",
  storageBucket: "PASTE_FROM_TASK_4",
  messagingSenderId: "PASTE_FROM_TASK_4",
  appId: "PASTE_FROM_TASK_4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const log = document.getElementById('log');
const btn = document.getElementById('run');

function line(msg, cls){
  const span = document.createElement('span');
  span.textContent = msg + '\n';
  if (cls) span.className = cls;
  log.appendChild(span);
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  let created = 0, skipped = 0, failed = 0;
  for (let n = 1; n <= 60; n++){
    const ref = doc(db, "blocks", String(n));
    try {
      const snap = await getDoc(ref);
      if (snap.exists()){ line(`#${n}: already exists, skipped`); skipped++; continue; }
      await setDoc(ref, {
        amount: n,
        status: "available",
        donor: null,
        pendingAt: null,
        claimedAt: null
      });
      line(`#${n}: created`, 'ok');
      created++;
    } catch(e){
      line(`#${n}: FAILED — ${e.message}`, 'err');
      failed++;
    }
  }
  line(`\nDone. Created: ${created}, skipped: ${skipped}, failed: ${failed}.`);
});
</script>
</body>
</html>
```

- [ ] **Step 2: Allow public writes temporarily**

The seed page writes to Firestore without authentication. The security rules from Task 8 will block it. So **temporarily** edit `firestore.rules` and replace the `match /blocks/{blockId}` block with:

```
    match /blocks/{blockId} {
      allow read, write: if true;  // TEMP — only during seeding
    }
```

Deploy the temporary rules:

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 3: Run the seed page**

```bash
firebase serve --only hosting --port 5050
```

Open http://localhost:5050/seed.html in your browser. Click **"Seed 60 blocks"**. Wait for the log to show all 60 blocks created. Verify in the Firebase Console → Firestore that the `blocks` collection now has documents `1` through `60`, all with `status: "available"`.

- [ ] **Step 4: Restore the real security rules**

Edit `firestore.rules` back to the version from Task 8. Re-deploy:

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 5: Stop the local server and delete seed.html**

Stop `firebase serve` with Ctrl+C. Then delete the seed file so it can't be re-run accidentally:

```bash
rm seed.html
```

(It's already in `firebase.json`'s ignore list, but deleting it removes any temptation.)

- [ ] **Step 6: Commit**

```bash
git add firebase.json .firebaserc firestore.rules firestore.indexes.json .gitignore
git commit -m "feat: firebase config, rules, and seeded blocks"
```

---

## Phase 4: Modify `index.html`

> **Important:** Phase 4 changes are substantial. Make a backup of the current `index.html` before starting:
> ```bash
> cp index.html index.html.bak
> ```
> After verification at the end of Phase 4, you can delete the backup.

### Task 12: Add Firebase SDK and create a shared `firebase-init.js`

To keep `index.html` and `admin.html` from duplicating the Firebase config, extract it into one shared module.

- [ ] **Step 1: Create `firebase-init.js`**

Path: `/Users/emmons_house/Desktop/teamemmons/firebase-init.js`

> Paste your real config values from Task 4 Step 2.

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "PASTE_FROM_TASK_4",
  authDomain: "PASTE_FROM_TASK_4",
  projectId: "PASTE_FROM_TASK_4",
  storageBucket: "PASTE_FROM_TASK_4",
  messagingSenderId: "PASTE_FROM_TASK_4",
  appId: "PASTE_FROM_TASK_4"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
```

- [ ] **Step 2: Verify**

No verification yet — this is consumed by later tasks.

### Task 13: Replace the static grid with an empty container

- [ ] **Step 1: Modify `index.html` — delete the 60 hardcoded block divs**

In `index.html`, find the section starting at the comment `<!-- ============== BLOCK GRID ============== -->` (around line 1357). Inside `<div class="grid" id="grid">`, **delete** the explanatory HTML comment and the 60 `<div class="block">...</div>` lines (the 60 children). Leave the `<div class="grid" id="grid">` tag and its closing `</div>` intact, but empty.

The result should look like:

```html
    <div class="grid" id="grid">
      <!-- blocks rendered by JS from Firestore -->
    </div>
```

- [ ] **Step 2: Verify (manual)**

Open `index.html` in a browser. The block grid section should be empty (you'll fill it back via Firestore in the next task). The rest of the page should still look fine.

### Task 14: Add styles for `.pending` and `.claimed-confirmed` block states

- [ ] **Step 1: Insert new CSS rules**

In `index.html`, find the `.block.claimed{` rule (around line 936). **Replace** the existing claimed rules with these (note: we're splitting the visual into "pending" and "claimed-confirmed"):

```css
/* Pending state — donor reserved, payment not yet received */
.block.pending{
  background:
    repeating-linear-gradient(45deg, var(--cream) 0 4px, var(--cream-2) 4px 8px);
  color:#8a8470;
  border:1px solid #c8c2b1;
  box-shadow:none;
  transform:none;
  cursor:default;
}
.block.pending::before{ display:none; }
.block.pending .amt{ color:#a89e83; }
.block.pending:hover{
  transform:none;
  background: repeating-linear-gradient(45deg, var(--cream) 0 4px, var(--cream-2) 4px 8px);
  box-shadow:none;
}
.block.pending[data-by]::before{
  content:attr(data-by);
  display:block;
  position:absolute;
  bottom:calc(100% + 8px);
  left:50%;
  transform:translateX(-50%);
  background:var(--ink);
  color:#fff;
  padding:6px 10px;
  border-radius:4px;
  font-family:"JetBrains Mono", monospace;
  font-size:10px;
  letter-spacing:0.14em;
  text-transform:uppercase;
  white-space:nowrap;
  opacity:0;
  pointer-events:none;
  transition:opacity 0.15s, bottom 0.15s;
  z-index:50;
  inset:auto;
}
.block.pending[data-by]:hover::before{
  opacity:1;
  bottom:calc(100% + 12px);
}

/* Claimed (confirmed) state — green */
.block.claimed{
  background: linear-gradient(160deg, #1b7a3a 0%, #0f5a2a 100%);
  color:#fff;
  border:1px solid #0a3d1e;
  cursor:default;
}
.block.claimed::before{ display:none; }
.block.claimed .amt{ color:#a8e8b6; }
.block.claimed:hover{
  transform:none;
  background: linear-gradient(160deg, #1b7a3a 0%, #0f5a2a 100%);
  box-shadow:0 8px 20px -8px rgba(11,90,42,0.55);
}
.block.claimed .donor-name{
  display:block;
  font-family:"JetBrains Mono", monospace;
  font-size:9px;
  font-weight:700;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:#a8e8b6;
  margin-top:4px;
  max-width:90%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  position:relative;
  z-index:2;
}
.block.available{
  cursor:pointer;
}
```

Also update the legend section (around line 856) to reflect three states:

Find this block:
```html
<div class="legend reveal delay-2">
  <div class="legend-item"><div class="legend-swatch avail"></div> Available</div>
  <div class="legend-item"><div class="legend-swatch claimed"></div> Claimed</div>
  <div class="legend-spacer"></div>
  <div class="find">Tip: hover a claimed block to see who picked it.</div>
</div>
```

Replace with:

```html
<div class="legend reveal delay-2">
  <div class="legend-item"><div class="legend-swatch avail"></div> Available</div>
  <div class="legend-item"><div class="legend-swatch pending"></div> Pending</div>
  <div class="legend-item"><div class="legend-swatch claimed"></div> Claimed</div>
  <div class="legend-spacer"></div>
  <div class="find">Tip: hover a pending or claimed block to see who picked it.</div>
</div>
```

And in the CSS, find the legend swatch rules and update them:

```css
.legend-swatch.avail{ background:var(--ink); }
.legend-swatch.pending{
  background:repeating-linear-gradient(45deg, var(--cream) 0 4px, var(--cream-2) 4px 8px);
  border:1px solid #c8c2b1;
}
.legend-swatch.claimed{
  background: linear-gradient(160deg, #1b7a3a 0%, #0f5a2a 100%);
}
```

- [ ] **Step 2: Verify (manual)**

Reload `index.html`. The legend should now show three states. The grid is still empty — fixed in Task 15.

### Task 15: Add the claim modal HTML and CSS

- [ ] **Step 1: Add modal HTML**

In `index.html`, just before the closing `</body>` tag (and before the existing `<script>` tag), insert this:

```html
<!-- ============== CLAIM MODAL ============== -->
<div class="modal-backdrop" id="modalBackdrop" hidden>
  <div class="modal" role="dialog" aria-labelledby="modalTitle" aria-modal="true">
    <button class="modal-close" id="modalClose" aria-label="Close">&times;</button>

    <!-- View 1: form -->
    <div class="modal-view" id="modalForm">
      <div class="modal-eyebrow">Reserve a block</div>
      <h2 class="modal-title" id="modalTitle">Block <span id="formBlockNum">—</span> <span class="dim">·</span> $<span id="formBlockAmt">—</span></h2>
      <form id="claimForm" novalidate>
        <label>First name
          <input name="firstName" type="text" required maxlength="40" autocomplete="given-name">
        </label>
        <label>Last name
          <input name="lastName" type="text" required maxlength="40" autocomplete="family-name">
        </label>
        <label>Email
          <input name="email" type="email" required maxlength="100" autocomplete="email">
        </label>
        <label>Phone
          <input name="phone" type="tel" required maxlength="30" autocomplete="tel" placeholder="(555) 555-1234">
        </label>
        <fieldset class="pay-choice">
          <legend>Payment method</legend>
          <label class="radio"><input type="radio" name="paymentMethod" value="venmo" required> Venmo</label>
          <label class="radio"><input type="radio" name="paymentMethod" value="zelle"> Zelle</label>
        </fieldset>
        <label class="checkbox">
          <input type="checkbox" name="anonymous"> Show me publicly as "Anonymous"
        </label>
        <div class="modal-error" id="modalError" hidden></div>
        <button type="submit" class="btn btn-primary" id="formSubmit">
          Reserve Block <span id="formBtnNum">—</span> <span class="arrow">→</span>
        </button>
      </form>
    </div>

    <!-- View 2: success -->
    <div class="modal-view" id="modalSuccess" hidden>
      <div class="modal-eyebrow ok">Block reserved</div>
      <h2 class="modal-title">Thanks, <span id="successName">friend</span>!</h2>
      <p>You've reserved <strong>Block #<span id="successNum">—</span></strong> for <strong>$<span id="successAmt">—</span></strong>.</p>
      <div class="pay-instruct" id="payInstruct"></div>
      <p class="nudge">Please send payment within 24 hours so we can confirm your block.</p>
      <button type="button" class="btn btn-ghost" id="successClose">Close</button>
    </div>

    <!-- View 3: race-lost -->
    <div class="modal-view" id="modalRaceLost" hidden>
      <div class="modal-eyebrow err">Just taken</div>
      <h2 class="modal-title">Sorry — that one's gone.</h2>
      <p>Block #<span id="raceNum">—</span> was claimed by someone else moments before you. Please close this and pick another.</p>
      <button type="button" class="btn btn-primary" id="raceClose">Pick another <span class="arrow">→</span></button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add modal CSS**

In the `<style>` block of `index.html`, after the existing block grid rules (near the bottom of the CSS, before the `RESPONSIVE` section), add:

```css
/* =========================================================
   CLAIM MODAL
   ========================================================= */
.modal-backdrop{
  position:fixed; inset:0;
  background:rgba(11,15,26,0.78);
  backdrop-filter: blur(6px);
  display:flex; align-items:center; justify-content:center;
  z-index:1000;
  padding:24px;
  animation: backdropIn .2s ease;
}
@keyframes backdropIn{ from{ opacity:0 } to{ opacity:1 } }
.modal{
  background:var(--cream);
  color:var(--ink);
  border-radius:10px;
  padding:36px 36px 32px;
  width:100%; max-width:480px;
  position:relative;
  box-shadow:0 30px 80px -20px rgba(0,0,0,0.55);
  animation: modalIn .25s cubic-bezier(.2,1.2,.4,1);
  max-height:90vh;
  overflow-y:auto;
}
@keyframes modalIn{
  from{ opacity:0; transform: translateY(20px) scale(0.98); }
  to{   opacity:1; transform: none; }
}
.modal-close{
  position:absolute; top:12px; right:14px;
  background:transparent; border:0;
  font-size:28px; color:#777; cursor:pointer;
  line-height:1;
}
.modal-close:hover{ color:var(--mat); }
.modal-eyebrow{
  font-family:"JetBrains Mono", monospace;
  font-size:11px; letter-spacing:0.2em; text-transform:uppercase;
  color:var(--mat); font-weight:700;
  margin-bottom:10px;
}
.modal-eyebrow.ok{ color:#0a7d2c; }
.modal-eyebrow.err{ color:var(--mat); }
.modal-title{
  font-family:"Anton", sans-serif;
  font-size:36px;
  text-transform:uppercase;
  line-height:0.95;
  margin-bottom:18px;
}
.modal-title .dim{ color:#aaa; font-weight:400; margin:0 4px; }
.modal label{
  display:block;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:0.14em;
  text-transform:uppercase;
  color:#555;
  margin-top:14px;
}
.modal input[type="text"],
.modal input[type="email"],
.modal input[type="tel"]{
  display:block;
  width:100%;
  margin-top:6px;
  padding:11px 14px;
  font-family:"Outfit", sans-serif;
  font-size:15px;
  background:#fff;
  border:1.5px solid #d6cfbb;
  border-radius:6px;
  color:var(--ink);
  text-transform:none;
  letter-spacing:0;
}
.modal input:focus{ outline:none; border-color:var(--mat); }
.modal input.invalid{ border-color:var(--mat); background:#fff4f3; }
.modal .pay-choice{
  margin-top:16px;
  border:0; padding:0;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:0.14em;
  text-transform:uppercase;
  color:#555;
}
.modal .pay-choice legend{ margin-bottom:8px; padding:0; }
.modal .pay-choice .radio{
  display:inline-flex; align-items:center; gap:8px;
  margin:0 16px 0 0;
  font-family:"Outfit", sans-serif;
  font-size:15px;
  text-transform:none; letter-spacing:0;
  color:var(--ink);
  cursor:pointer;
}
.modal .checkbox{
  display:flex; align-items:center; gap:10px;
  margin-top:16px;
  font-family:"Outfit", sans-serif;
  font-size:14px;
  text-transform:none; letter-spacing:0;
  color:#444;
  cursor:pointer;
}
.modal .checkbox input{ width:16px; height:16px; }
.modal-error{
  margin-top:14px;
  padding:10px 12px;
  background:#fff4f3;
  border:1px solid var(--mat);
  color:var(--mat-deep);
  border-radius:6px;
  font-size:14px;
}
.modal #formSubmit{
  margin-top:22px;
  width:100%;
  justify-content:center;
}
.modal #formSubmit:disabled{ opacity:.6; cursor:default; }
.pay-instruct{
  margin:18px 0;
  padding:18px 20px;
  background:var(--ink);
  color:#fff;
  border-radius:8px;
  font-family:"JetBrains Mono", monospace;
  font-size:14px;
  line-height:1.6;
}
.pay-instruct b{ color:var(--gold); }
.pay-instruct .copyrow{
  display:flex; align-items:center; gap:10px;
  margin-top:10px;
}
.pay-instruct .copy-btn{
  background:transparent;
  color:var(--gold);
  border:1px solid var(--gold);
  border-radius:4px;
  padding:4px 10px;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:0.14em;
  text-transform:uppercase;
  cursor:pointer;
}
.pay-instruct .copy-btn.copied{ background:var(--gold); color:var(--ink); }
.nudge{
  font-size:13px;
  color:#666;
  border-left:3px solid var(--gold);
  padding-left:12px;
  margin:14px 0 20px;
}
.modal #successClose, .modal #raceClose{
  margin-top:10px;
  width:100%;
  justify-content:center;
}

/* All-claimed banner */
.all-claimed-banner{
  margin:0 0 24px;
  padding:18px 22px;
  background: linear-gradient(135deg, #1b7a3a, #0f5a2a);
  color:#fff;
  border-radius:8px;
  font-family:"Anton", sans-serif;
  font-size:24px;
  letter-spacing:0.02em;
  text-transform:uppercase;
  text-align:center;
}
```

- [ ] **Step 3: Verify (manual)**

Reload `index.html`. The modal is hidden (`hidden` attribute) so the page should look identical to before. The grid is still empty — fixed in Task 16.

### Task 16: Replace the page's `<script>` block with the Firebase-backed version

- [ ] **Step 1: Replace the entire existing `<script>` block in `index.html`**

Find the `<script>` tag near the bottom (around line 1495 in the original file). **Replace the entire `<script>` to `</script>` block** with:

```html
<script type="module">
import {
  collection, doc, onSnapshot, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

/* --------- Ticker (unchanged) ---------------------------- */
const tickerItems = [
  "★ Road to Fargo 2026",
  "60 blocks · $1,830 goal",
  "Team Pennsylvania · 165 Greco",
  "July 13–15 · Fargo, ND",
  "Pick a number · Send a few bucks",
  "★ Every block matters",
  "Shaler Area · Glenshaw, PA"
];
const track = document.getElementById('tickerTrack');
if (track){
  const html = tickerItems.map(t => `<span><span class="dot"></span>${t}</span>`).join('');
  track.innerHTML = html + html + html;
}

/* --------- Grid + scoreboard render ---------------------- */
const milestones = new Set([10,20,30,40,50,60]);
const grid = document.getElementById('grid');
const raisedEl = document.getElementById('raisedAmount');
const claimedCountEl = document.getElementById('claimedCount');
const remainingNumEl = document.getElementById('remainingNum');
const fill = document.getElementById('progressFill');
const goal = 1830;

let blocksState = new Map(); // blockNum -> { amount, status, donor }
let firstRender = true;
const cellEls = new Map(); // blockNum -> DOM element (reused across renders)

function publicNameFor(donor){
  if (!donor) return null;
  return donor.anonymous ? "Anonymous" : donor.firstName;
}

function ensureCellsBuilt(){
  if (cellEls.size > 0) return;
  for (let n = 1; n <= 60; n++){
    const el = document.createElement('div');
    el.className = 'block available';
    el.dataset.num = n;
    el.style.setProperty('--i', n - 1);
    el.innerHTML = `<span class="num">${n}</span><span class="amt">$${n}</span>`;
    grid.appendChild(el);
    cellEls.set(n, el);
  }
}

function paintCell(n){
  const el = cellEls.get(n);
  if (!el) return;
  const data = blocksState.get(n) || { amount: n, status: 'available', donor: null };

  // Reset classes
  el.className = 'block ' + (data.status === 'available' ? 'available' : data.status);
  if (milestones.has(n) && data.status === 'available') el.classList.add('milestone');

  // Hover-name tooltip
  const name = publicNameFor(data.donor);
  if (name) el.dataset.by = name; else delete el.dataset.by;

  // Inner content
  let inner = `<span class="num">${n}</span><span class="amt">$${n}</span>`;
  if (data.status === 'claimed' && name){
    inner += `<span class="donor-name"></span>`;
  }
  el.innerHTML = inner;
  if (data.status === 'claimed' && name){
    el.querySelector('.donor-name').textContent = name;
  }
}

function renderGrid(){
  ensureCellsBuilt();

  let raised = 0, claimed = 0;
  for (let n = 1; n <= 60; n++){
    paintCell(n);
    const d = blocksState.get(n);
    if (d && d.status === 'claimed'){ raised += d.amount; claimed++; }
  }

  // Scoreboard
  raisedEl.innerHTML = '<span class="currency">$</span>' + raised.toLocaleString();
  claimedCountEl.textContent = claimed;
  remainingNumEl.textContent = 60 - claimed;
  const pct = Math.min(100, (raised / goal) * 100);
  fill.style.width = pct + '%';

  // All-claimed banner — add when full, remove when not
  const blocksSection = grid.parentElement;
  let banner = blocksSection.querySelector('.all-claimed-banner');
  if (claimed === 60 && !banner){
    banner = document.createElement('div');
    banner.className = 'all-claimed-banner';
    banner.textContent = '🎉 We did it — Weston is going to Fargo. Thank you.';
    blocksSection.insertBefore(banner, blocksSection.querySelector('.legend'));
  } else if (claimed < 60 && banner){
    banner.remove();
  }

  // Trigger entrance animation only on first paint
  if (firstRender){
    firstRender = false;
    requestAnimationFrame(() => grid.classList.add('in'));
  }
}

/* --------- Live subscription ----------------------------- */
onSnapshot(collection(db, 'blocks'), (snap) => {
  snap.docChanges().forEach(change => {
    const data = change.doc.data();
    const n = parseInt(change.doc.id, 10);
    if (change.type === 'removed') blocksState.delete(n);
    else blocksState.set(n, data);
  });
  renderGrid();
}, (err) => {
  console.error('Firestore listener error:', err);
  grid.innerHTML = '<p style="grid-column:1/-1;color:#a40e1f;font-family:JetBrains Mono,monospace;font-size:13px;">Couldn\'t load blocks. Please refresh — and you can still donate using the Venmo/Zelle info above.</p>';
});

/* --------- Claim modal ----------------------------------- */
const backdrop = document.getElementById('modalBackdrop');
const viewForm = document.getElementById('modalForm');
const viewSuccess = document.getElementById('modalSuccess');
const viewRace = document.getElementById('modalRaceLost');
const form = document.getElementById('claimForm');
const formError = document.getElementById('modalError');
const formSubmit = document.getElementById('formSubmit');
const formBlockNum = document.getElementById('formBlockNum');
const formBlockAmt = document.getElementById('formBlockAmt');
const formBtnNum = document.getElementById('formBtnNum');
const successName = document.getElementById('successName');
const successNum = document.getElementById('successNum');
const successAmt = document.getElementById('successAmt');
const payInstruct = document.getElementById('payInstruct');
const raceNum = document.getElementById('raceNum');

let activeBlockNum = null;

function openModal(n){
  activeBlockNum = n;
  formError.hidden = true;
  formError.textContent = '';
  form.reset();
  formSubmit.disabled = false;
  formBlockNum.textContent = n;
  formBlockAmt.textContent = n;
  formBtnNum.textContent = '#' + n;
  viewForm.hidden = false;
  viewSuccess.hidden = true;
  viewRace.hidden = true;
  backdrop.hidden = false;
  // focus first field
  setTimeout(() => form.elements['firstName'].focus(), 50);
}
function closeModal(){
  backdrop.hidden = true;
  activeBlockNum = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('successClose').addEventListener('click', closeModal);
document.getElementById('raceClose').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

grid.addEventListener('click', (e) => {
  const cell = e.target.closest('.block.available');
  if (!cell) return;
  const n = parseInt(cell.dataset.num, 10);
  openModal(n);
});

/* --------- Submit a claim (transaction) ----------------- */
const RATE_LIMIT_MS = 30 * 1000;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  // Rate limit
  const lastSubmit = parseInt(localStorage.getItem('lastSubmitAt') || '0', 10);
  if (Date.now() - lastSubmit < RATE_LIMIT_MS){
    formError.hidden = false;
    formError.textContent = "Please wait a moment before submitting again.";
    return;
  }

  // Validate
  const fd = new FormData(form);
  const donor = {
    firstName: (fd.get('firstName') || '').toString().trim(),
    lastName:  (fd.get('lastName')  || '').toString().trim(),
    email:     (fd.get('email')     || '').toString().trim(),
    phone:     (fd.get('phone')     || '').toString().trim(),
    paymentMethod: (fd.get('paymentMethod') || '').toString(),
    anonymous: fd.get('anonymous') === 'on'
  };
  if (!donor.firstName || !donor.lastName || !donor.email || !donor.phone || !donor.paymentMethod){
    formError.hidden = false;
    formError.textContent = "Please fill out every field.";
    return;
  }
  if (!/.+@.+\..+/.test(donor.email)){
    formError.hidden = false;
    formError.textContent = "Please enter a valid email.";
    return;
  }

  formSubmit.disabled = true;
  formSubmit.innerHTML = 'Reserving… ';

  const blockRef = doc(db, 'blocks', String(activeBlockNum));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(blockRef);
      if (!snap.exists()) throw new Error('NOT_FOUND');
      if (snap.data().status !== 'available') throw new Error('RACE_LOST');
      tx.update(blockRef, {
        status: 'pending',
        donor: donor,
        pendingAt: serverTimestamp()
      });
    });
    localStorage.setItem('lastSubmitAt', Date.now().toString());
    showSuccess(donor);
  } catch(err){
    formSubmit.disabled = false;
    formSubmit.innerHTML = 'Reserve Block #' + activeBlockNum + ' <span class="arrow">→</span>';
    if (err.message === 'RACE_LOST' || err.message === 'NOT_FOUND'){
      showRaceLost();
    } else {
      console.error(err);
      formError.hidden = false;
      formError.textContent = "Couldn't reserve — please try again.";
    }
  }
});

function showSuccess(donor){
  successName.textContent = donor.firstName;
  successNum.textContent = activeBlockNum;
  successAmt.textContent = activeBlockNum;
  const method = donor.paymentMethod;
  if (method === 'venmo'){
    payInstruct.innerHTML = `
      Send <b>$${activeBlockNum}</b> on <b>Venmo</b> to:
      <div class="copyrow"><b>@Celia-Emmons</b>
        <button type="button" class="copy-btn" data-copy="@Celia-Emmons">Copy</button>
      </div>
      Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
  } else {
    payInstruct.innerHTML = `
      Send <b>$${activeBlockNum}</b> on <b>Zelle</b> to:
      <div class="copyrow"><b>937-654-9895</b>
        <button type="button" class="copy-btn" data-copy="937-654-9895">Copy</button>
      </div>
      Please include <b>"Block #${activeBlockNum}"</b> in the payment note.`;
  }
  viewForm.hidden = true;
  viewSuccess.hidden = false;
}

function showRaceLost(){
  raceNum.textContent = activeBlockNum;
  viewForm.hidden = true;
  viewRace.hidden = false;
}

/* --------- Copy buttons (existing + modal) -------------- */
document.body.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const text = btn.getAttribute('data-copy');
  try {
    await navigator.clipboard.writeText(text);
  } catch(_){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(__){}
    document.body.removeChild(ta);
  }
  const original = btn.textContent;
  btn.textContent = 'Copied';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1400);
});

/* --------- IntersectionObserver for reveals ------------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.target.classList.contains('reveal')){
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
}, {threshold: 0.15});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* --------- Subtle parallax on hero photo ---------------- */
const photo = document.querySelector('.photo-frame img');
if (photo && window.matchMedia('(min-width: 760px)').matches){
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 600) return;
    photo.style.transform = `scale(1.02) translateY(${y * 0.05}px)`;
  }, {passive: true});
}
</script>
```

Note the `type="module"` — required for ES imports.

- [ ] **Step 2: Add `<script type="module" src="firebase-init.js"></script>` is NOT needed**

The new script imports directly from `./firebase-init.js`, so no additional script tag is required. The single `<script type="module">` block above is the only script needed.

- [ ] **Step 3: Manual verification — local emulator run**

Start the Firebase emulators:

```bash
firebase emulators:start
```

In the output, look for the **Hosting** URL (typically http://127.0.0.1:5000). Open it.

Check these:
- Page loads fully (hero, letter, etc.).
- Block grid renders with all 60 blocks (all available — dark, with milestone red on 10/20/30/40/50/60).
- Scoreboard shows $0 raised, 0/60 claimed.
- Clicking a block opens the modal.
- The modal closes via the X, backdrop click, and Escape (already wired? — check; if not, no action needed, it's a small nicety).

Wait — the emulator UI runs a fresh Firestore. You'll need to seed the emulator too. Open the Emulator UI (typically http://127.0.0.1:4000), go to Firestore, and either:
- Manually add a `config/admins` doc and a couple of `blocks/N` docs, OR
- Temporarily point `firebase-init.js` at production (not the emulator) for this smoke test — simpler.

For the smoke test, the simplest path is to NOT connect to the emulator and just talk to production. That is the default behavior of the SDK unless you explicitly call `connectFirestoreEmulator`. So just run a static server to test against your real seeded data:

```bash
firebase serve --only hosting --port 5050
```

Then open http://localhost:5050/. The grid should fill with the 60 available blocks you seeded in Task 11.

- [ ] **Step 4: Commit**

```bash
git add index.html firebase-init.js
git commit -m "feat(public): dynamic block grid + claim modal backed by Firestore"
```

---

## Phase 5: Build `admin.html`

### Task 17: Create the admin shell with Google sign-in

- [ ] **Step 1: Create `admin.html`**

Path: `/Users/emmons_house/Desktop/teamemmons/admin.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Road to Fargo · Admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#0B0F1A; --ink-2:#141a28; --ink-3:#1d2436;
  --cream:#F6F1E4; --mat:#C8102E; --gold:#FFB81C;
  --line:rgba(255,255,255,0.1);
}
*,*::before,*::after{ box-sizing:border-box; }
body{
  margin:0; font-family:"Outfit", system-ui, sans-serif;
  font-size:15px; color:#fff; background:var(--ink);
  min-height:100vh;
}
.wrap{ max-width:1200px; margin:0 auto; padding:0 24px; }
.display{ font-family:"Anton", sans-serif; text-transform:uppercase; letter-spacing:.02em; line-height:.9; }
.mono{ font-family:"JetBrains Mono", monospace; }

/* Header bar */
.bar{
  background:#06090f;
  padding:16px 24px;
  display:flex; align-items:center; justify-content:space-between;
  border-bottom:1px solid var(--line);
}
.bar .brand{
  font-family:"Anton", sans-serif;
  font-size:22px;
  text-transform:uppercase;
  letter-spacing:.04em;
}
.bar .brand .red{ color:var(--mat); }
.bar .brand .gold{ color:var(--gold); }
.bar .who{
  font-family:"JetBrains Mono", monospace;
  font-size:12px;
  color:#9fb0c8;
}
.bar .who b{ color:#fff; }
.btn-out{
  margin-left:14px;
  background:transparent;
  border:1px solid var(--line);
  color:#fff;
  padding:6px 12px;
  border-radius:4px;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  cursor:pointer;
}
.btn-out:hover{ border-color:var(--gold); color:var(--gold); }

/* Sign-in screen */
.signin{
  min-height:80vh;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center;
  padding:40px 24px;
}
.signin h1{
  font-family:"Anton", sans-serif;
  font-size:48px;
  text-transform:uppercase;
  letter-spacing:.03em;
  margin-bottom:14px;
}
.signin h1 .red{ color:var(--mat); }
.signin h1 .gold{ color:var(--gold); }
.signin p{ color:#9fb0c8; margin-bottom:32px; }
.btn-google{
  display:inline-flex; align-items:center; gap:12px;
  background:#fff; color:#1a1a1a;
  border:0; border-radius:6px;
  padding:12px 22px;
  font-family:"Outfit", sans-serif;
  font-size:15px;
  font-weight:600;
  cursor:pointer;
  box-shadow:0 6px 20px -6px rgba(0,0,0,0.5);
}
.btn-google:hover{ transform: translateY(-1px); }
.signin .err{
  margin-top:20px; padding:14px 18px;
  background:rgba(200,16,46,0.08);
  border:1px solid rgba(200,16,46,0.3);
  border-radius:6px;
  color:#ff9aa5;
  max-width:420px;
}

/* Dashboard */
.dash{ padding:40px 0 60px; }
.section-title{
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:.22em;
  text-transform:uppercase;
  color:var(--gold);
  margin:36px 0 14px;
}
.stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
}
.stat-card{
  background:var(--ink-2);
  border:1px solid var(--line);
  border-radius:8px;
  padding:18px 20px;
}
.stat-card .v{
  font-family:"Anton", sans-serif;
  font-size:40px;
  letter-spacing:.01em;
  color:#fff;
  line-height:.9;
}
.stat-card .v .currency{ color:var(--gold); font-size:.6em; vertical-align:.18em; margin-right:2px; }
.stat-card .l{
  font-family:"JetBrains Mono", monospace;
  font-size:10px;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:#9fb0c8;
  margin-top:6px;
}

/* Pending list */
.pending-list{ display:grid; gap:10px; }
.pending-row{
  background:var(--ink-2);
  border:1px solid var(--line);
  border-radius:8px;
  padding:16px 18px;
  display:grid;
  grid-template-columns:auto 1fr auto;
  gap:18px;
  align-items:center;
}
.pending-row .blocknum{
  font-family:"Anton", sans-serif;
  font-size:38px;
  color:var(--gold);
  line-height:.9;
  min-width:60px;
  text-align:center;
}
.pending-row .blocknum small{
  display:block;
  font-family:"JetBrains Mono", monospace;
  font-size:10px;
  letter-spacing:.18em;
  color:#9fb0c8;
  margin-top:4px;
}
.pending-row .info .name{
  font-weight:700; font-size:17px;
  margin-bottom:4px;
}
.pending-row .info .meta{
  font-family:"JetBrains Mono", monospace;
  font-size:12px;
  color:#9fb0c8;
  letter-spacing:.06em;
}
.pending-row .info .meta a{ color:#cdd6e6; }
.pending-row .info .age{
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  color:#9fb0c8;
  margin-top:6px;
  letter-spacing:.14em;
  text-transform:uppercase;
}
.pending-row .actions{
  display:flex; gap:8px; flex-wrap:wrap;
  justify-content:flex-end;
}
.btn-action{
  border:0; border-radius:4px;
  padding:8px 14px;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  cursor:pointer;
  font-weight:700;
}
.btn-action.confirm{ background:#1b7a3a; color:#fff; }
.btn-action.confirm:hover{ background:#23994a; }
.btn-action.release{ background:transparent; color:#fff; border:1px solid var(--line); }
.btn-action.release:hover{ border-color:var(--mat); color:var(--mat); }
.btn-action.edit{ background:transparent; color:#fff; border:1px solid var(--line); }
.btn-action.edit:hover{ border-color:var(--gold); color:var(--gold); }
.btn-action:disabled{ opacity:.5; cursor:default; }
.empty{
  background:var(--ink-2);
  border:1px dashed var(--line);
  border-radius:8px;
  padding:24px;
  text-align:center;
  color:#9fb0c8;
}

/* Admin grid */
.admin-grid{
  display:grid;
  grid-template-columns:repeat(10,1fr);
  gap:8px;
}
.ab{
  aspect-ratio:1/1;
  border-radius:4px;
  display:flex; align-items:center; justify-content:center;
  font-family:"Anton", sans-serif;
  font-size:18px;
  cursor:pointer;
  border:1px solid transparent;
  transition: transform .12s ease;
}
.ab:hover{ transform: scale(1.06); }
.ab.available{ background:var(--ink-3); color:#fff; }
.ab.pending{ background:#3b3825; color:var(--gold); }
.ab.claimed{ background:#0f5a2a; color:#a8e8b6; }
.ab.selected{ outline:2px solid var(--gold); outline-offset:2px; }

.bottom-actions{ margin-top:24px; }
.btn-manual{
  background:var(--gold); color:var(--ink);
  border:0; border-radius:6px;
  padding:12px 20px;
  font-family:"Outfit", sans-serif;
  font-weight:700;
  font-size:14px;
  cursor:pointer;
}

/* Modal (admin) */
.amodal-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,0.72);
  display:flex; align-items:center; justify-content:center;
  padding:24px; z-index:1000;
}
.amodal{
  background:var(--ink-2);
  border:1px solid var(--line);
  border-radius:10px;
  padding:32px 28px;
  width:100%; max-width:440px;
  max-height:90vh; overflow-y:auto;
  position:relative;
}
.amodal h3{
  font-family:"Anton", sans-serif;
  font-size:28px;
  text-transform:uppercase;
  margin:0 0 16px;
}
.amodal label{
  display:block;
  font-family:"JetBrains Mono", monospace;
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:#9fb0c8;
  margin-top:12px;
}
.amodal input, .amodal select{
  display:block; width:100%;
  margin-top:6px;
  padding:10px 12px;
  background:var(--ink-3);
  border:1px solid var(--line);
  border-radius:5px;
  color:#fff;
  font-family:"Outfit", sans-serif;
  font-size:14px;
}
.amodal .radio{
  display:inline-flex; align-items:center; gap:8px;
  margin:8px 16px 0 0;
  font-family:"Outfit", sans-serif;
  color:#fff;
  font-size:14px;
  text-transform:none; letter-spacing:0;
}
.amodal .checkbox{
  display:flex; align-items:center; gap:10px;
  margin-top:14px;
  font-family:"Outfit", sans-serif;
  font-size:13px;
  text-transform:none; letter-spacing:0;
  color:#cdd6e6;
}
.amodal .actions-row{
  display:flex; gap:10px; margin-top:22px; flex-wrap:wrap;
}
.amodal .actions-row button{ flex:1 1 auto; }
.amodal .err{
  margin-top:14px; padding:10px 12px;
  background:rgba(200,16,46,0.1); border:1px solid rgba(200,16,46,0.4);
  border-radius:5px; color:#ff9aa5; font-size:13px;
}
.amodal .close{
  position:absolute; top:10px; right:14px;
  background:transparent; border:0; color:#9fb0c8;
  font-size:24px; cursor:pointer; line-height:1;
}

@media (max-width: 880px){
  .stats{ grid-template-columns:repeat(2,1fr); }
  .admin-grid{ grid-template-columns:repeat(6,1fr); }
  .pending-row{ grid-template-columns:1fr; }
  .pending-row .actions{ justify-content:flex-start; }
}
</style>
</head>
<body>

<div class="bar">
  <div class="brand"><span class="red">★</span> Road <span class="gold">to</span> Fargo · Admin</div>
  <div id="whoBar" hidden>
    <span class="who">Signed in as <b id="whoEmail">—</b></span>
    <button class="btn-out" id="btnSignOut">Sign out</button>
  </div>
</div>

<!-- Sign-in -->
<div class="signin" id="signinScreen">
  <h1><span class="red">★</span> Admin <span class="gold">Login</span></h1>
  <p>Sign in with your Google account to manage blocks.</p>
  <button class="btn-google" id="btnSignIn">
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.61z"/><path fill="#34a853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.94v2.33A9 9 0 0 0 9 18z"/><path fill="#fbbc05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.04l3.03-2.33z"/><path fill="#ea4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0a9 9 0 0 0-8.06 4.96l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
    Sign in with Google
  </button>
  <div class="err" id="signinErr" hidden></div>
</div>

<!-- Dashboard -->
<div class="dash wrap" id="dashScreen" hidden>
  <div class="section-title">Stats</div>
  <div class="stats">
    <div class="stat-card"><div class="v"><span class="currency">$</span><span id="sRaised">0</span></div><div class="l">Raised</div></div>
    <div class="stat-card"><div class="v"><span id="sClaimed">0</span>/60</div><div class="l">Claimed</div></div>
    <div class="stat-card"><div class="v"><span id="sPending">0</span></div><div class="l">Pending</div></div>
    <div class="stat-card"><div class="v"><span class="currency">$</span><span id="sLeft">1,830</span></div><div class="l">Left to goal</div></div>
  </div>

  <div class="section-title">Pending — confirm payment</div>
  <div class="pending-list" id="pendingList">
    <div class="empty">No pending blocks.</div>
  </div>

  <div class="section-title">All blocks</div>
  <div class="admin-grid" id="adminGrid"></div>

  <div class="bottom-actions">
    <button class="btn-manual" id="btnManual">+ Manually claim a block</button>
  </div>
</div>

<script type="module" src="./admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `admin.js`**

Path: `/Users/emmons_house/Desktop/teamemmons/admin.js`

```js
import { db, auth } from "./firebase-init.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  collection, doc, getDoc, onSnapshot, updateDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* --------- Elements ----------------------------------- */
const signinScreen = document.getElementById('signinScreen');
const dashScreen = document.getElementById('dashScreen');
const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const signinErr = document.getElementById('signinErr');
const whoBar = document.getElementById('whoBar');
const whoEmail = document.getElementById('whoEmail');
const sRaised = document.getElementById('sRaised');
const sClaimed = document.getElementById('sClaimed');
const sPending = document.getElementById('sPending');
const sLeft = document.getElementById('sLeft');
const pendingList = document.getElementById('pendingList');
const adminGrid = document.getElementById('adminGrid');
const btnManual = document.getElementById('btnManual');

const goal = 1830;
let blocksState = new Map();
let unsubscribe = null;
let isAdmin = false;
let selectedBlockNum = null;

/* --------- Sign-in flow ------------------------------- */
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

btnSignIn.addEventListener('click', async () => {
  signinErr.hidden = true;
  try {
    await signInWithPopup(auth, provider);
  } catch(e){
    if (e.code === 'auth/popup-closed-by-user') return;
    signinErr.hidden = false;
    signinErr.textContent = "Sign-in failed: " + (e.message || e.code);
  }
});

btnSignOut.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user){
    teardownDashboard();
    return;
  }
  // Whitelist check
  const allowed = await isWhitelisted(user.email);
  if (!allowed){
    signinErr.hidden = false;
    signinErr.textContent = "This account (" + user.email + ") is not on the admin list.";
    await signOut(auth);
    return;
  }
  isAdmin = true;
  whoEmail.textContent = user.email;
  whoBar.hidden = false;
  signinScreen.hidden = true;
  dashScreen.hidden = false;
  startListening();
});

async function isWhitelisted(email){
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    if (!snap.exists()) return false;
    const emails = (snap.data().emails || []).map(s => s.toLowerCase());
    return emails.includes(email.toLowerCase());
  } catch(e){
    console.error('whitelist check failed', e);
    return false;
  }
}

function teardownDashboard(){
  if (unsubscribe){ unsubscribe(); unsubscribe = null; }
  isAdmin = false;
  whoBar.hidden = true;
  dashScreen.hidden = true;
  signinScreen.hidden = false;
}

/* --------- Live data ---------------------------------- */
function startListening(){
  unsubscribe = onSnapshot(collection(db, 'blocks'), (snap) => {
    snap.docChanges().forEach(change => {
      const n = parseInt(change.doc.id, 10);
      if (change.type === 'removed') blocksState.delete(n);
      else blocksState.set(n, change.doc.data());
    });
    renderStats();
    renderPendingList();
    renderAdminGrid();
  }, (err) => {
    console.error('Listener failed:', err);
  });
}

/* --------- Stats -------------------------------------- */
function renderStats(){
  let raised = 0, claimed = 0, pending = 0;
  for (const [n, data] of blocksState){
    if (data.status === 'claimed'){ raised += data.amount; claimed++; }
    else if (data.status === 'pending'){ pending++; }
  }
  sRaised.textContent = raised.toLocaleString();
  sClaimed.textContent = claimed;
  sPending.textContent = pending;
  sLeft.textContent = (goal - raised).toLocaleString();
}

/* --------- Pending list ------------------------------- */
function formatAge(ts){
  if (!ts || !ts.toMillis) return '—';
  const ms = Date.now() - ts.toMillis();
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ' + (hrs % 24) + 'h ago';
}

function renderPendingList(){
  const pending = [...blocksState.entries()]
    .filter(([_, d]) => d.status === 'pending')
    .sort((a, b) => {
      const at = a[1].pendingAt?.toMillis?.() || 0;
      const bt = b[1].pendingAt?.toMillis?.() || 0;
      return at - bt;
    });

  if (pending.length === 0){
    pendingList.innerHTML = '<div class="empty">No pending blocks. 🎯</div>';
    return;
  }

  pendingList.innerHTML = '';
  for (const [n, data] of pending){
    const d = data.donor || {};
    const row = document.createElement('div');
    row.className = 'pending-row';
    row.innerHTML = `
      <div class="blocknum">#${n}<small>$${data.amount}</small></div>
      <div class="info">
        <div class="name">${escapeHtml(d.firstName || '')} ${escapeHtml(d.lastName || '')}${d.anonymous ? ' <em style="opacity:.7">(wants anonymous)</em>' : ''}</div>
        <div class="meta">
          <a href="mailto:${encodeURIComponent(d.email || '')}">${escapeHtml(d.email || '')}</a>
          · <a href="tel:${encodeURIComponent(d.phone || '')}">${escapeHtml(d.phone || '')}</a>
          · ${(d.paymentMethod || '').toUpperCase()}
        </div>
        <div class="age">Pended ${formatAge(data.pendingAt)}</div>
      </div>
      <div class="actions">
        <button class="btn-action confirm" data-action="confirm" data-num="${n}">Confirm Paid</button>
        <button class="btn-action release" data-action="release" data-num="${n}">Release</button>
        <button class="btn-action edit"    data-action="edit"    data-num="${n}">Edit info</button>
      </div>`;
    pendingList.appendChild(row);
  }
}

pendingList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const n = parseInt(btn.dataset.num, 10);
  const action = btn.dataset.action;
  btn.disabled = true;
  Promise.resolve()
    .then(() => {
      if (action === 'confirm') return confirmBlock(n);
      if (action === 'release') return releaseBlock(n);
      if (action === 'edit')    return openEditModal(n);
    })
    .catch(err => {
      console.error(err);
      alert("Couldn't update block — try again.");
    })
    .finally(() => { btn.disabled = false; });
});

/* --------- Admin grid --------------------------------- */
function renderAdminGrid(){
  adminGrid.innerHTML = '';
  for (let n = 1; n <= 60; n++){
    const data = blocksState.get(n) || { amount: n, status: 'available' };
    const el = document.createElement('div');
    el.className = 'ab ' + data.status;
    el.dataset.num = n;
    el.textContent = n;
    adminGrid.appendChild(el);
  }
}

adminGrid.addEventListener('click', (e) => {
  const cell = e.target.closest('.ab');
  if (!cell) return;
  const n = parseInt(cell.dataset.num, 10);
  openBlockActionsModal(n);
});

btnManual.addEventListener('click', () => {
  // Find first available block as default
  let n = null;
  for (let i = 1; i <= 60; i++){
    if ((blocksState.get(i)?.status || 'available') === 'available'){ n = i; break; }
  }
  if (n == null){ alert('No available blocks left.'); return; }
  openManualClaimModal(n);
});

/* --------- Actions ------------------------------------ */
async function confirmBlock(n){
  await updateDoc(doc(db, 'blocks', String(n)), {
    status: 'claimed',
    claimedAt: serverTimestamp()
  });
}
async function releaseBlock(n){
  if (!confirm(`Release Block #${n} back to available?`)) return;
  await setDoc(doc(db, 'blocks', String(n)), {
    amount: n,
    status: 'available',
    donor: null,
    pendingAt: null,
    claimedAt: null
  });
}

/* --------- Modals ------------------------------------- */
function modalShell(title, bodyHtml){
  const back = document.createElement('div');
  back.className = 'amodal-backdrop';
  back.innerHTML = `
    <div class="amodal">
      <button class="close" aria-label="Close">&times;</button>
      <h3>${escapeHtml(title)}</h3>
      ${bodyHtml}
    </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.close').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  return { back, close };
}

function openBlockActionsModal(n){
  const data = blocksState.get(n);
  if (!data) return;
  const d = data.donor || {};
  let body = '';
  if (data.status === 'available'){
    body = `
      <p>Block #${n} is <strong>available</strong>.</p>
      <div class="actions-row">
        <button class="btn-action confirm" id="actManual">Manually claim this block</button>
      </div>`;
  } else {
    body = `
      <p><strong>${escapeHtml(d.firstName || '')} ${escapeHtml(d.lastName || '')}</strong> ${d.anonymous ? '<em style="opacity:.7">(wants anonymous)</em>' : ''}</p>
      <p class="mono" style="color:#9fb0c8;font-size:12px;">
        <a href="mailto:${encodeURIComponent(d.email || '')}" style="color:#cdd6e6">${escapeHtml(d.email || '')}</a><br>
        <a href="tel:${encodeURIComponent(d.phone || '')}" style="color:#cdd6e6">${escapeHtml(d.phone || '')}</a><br>
        ${(d.paymentMethod || '').toUpperCase()}
      </p>
      <div class="actions-row">
        ${data.status === 'pending' ? `<button class="btn-action confirm" id="actConfirm">Confirm Paid</button>` : ''}
        <button class="btn-action release" id="actRelease">Release</button>
        <button class="btn-action edit" id="actEdit">Edit info</button>
      </div>`;
  }
  const { close } = modalShell(`Block #${n} — $${n}`, body);
  if (data.status === 'available'){
    document.getElementById('actManual').onclick = () => { close(); openManualClaimModal(n); };
  } else {
    if (data.status === 'pending'){
      document.getElementById('actConfirm').onclick = async () => { await confirmBlock(n); close(); };
    }
    document.getElementById('actRelease').onclick = async () => { await releaseBlock(n); close(); };
    document.getElementById('actEdit').onclick    = () => { close(); openEditModal(n); };
  }
}

function donorFormHtml(prefill){
  prefill = prefill || {};
  return `
    <label>First name<input id="fF" maxlength="40" value="${escapeAttr(prefill.firstName || '')}"></label>
    <label>Last name<input id="fL" maxlength="40" value="${escapeAttr(prefill.lastName || '')}"></label>
    <label>Email<input id="fE" type="email" maxlength="100" value="${escapeAttr(prefill.email || '')}"></label>
    <label>Phone<input id="fP" maxlength="30" value="${escapeAttr(prefill.phone || '')}"></label>
    <label>Payment method
      <div>
        <label class="radio"><input type="radio" name="fM" value="venmo" ${prefill.paymentMethod === 'venmo' ? 'checked' : ''}> Venmo</label>
        <label class="radio"><input type="radio" name="fM" value="zelle" ${prefill.paymentMethod === 'zelle' ? 'checked' : ''}> Zelle</label>
      </div>
    </label>
    <label class="checkbox"><input type="checkbox" id="fA" ${prefill.anonymous ? 'checked' : ''}> Show publicly as "Anonymous"</label>
    <div class="err" id="fErr" hidden></div>`;
}

function readDonorForm(){
  const get = (id) => document.getElementById(id).value.trim();
  return {
    firstName: get('fF'),
    lastName:  get('fL'),
    email:     get('fE'),
    phone:     get('fP'),
    paymentMethod: (document.querySelector('input[name="fM"]:checked') || {}).value || '',
    anonymous: document.getElementById('fA').checked
  };
}

function openManualClaimModal(defaultNum){
  const body = `
    <label>Block #
      <input id="fNum" type="number" min="1" max="60" value="${defaultNum}">
    </label>
    ${donorFormHtml({ paymentMethod: 'venmo' })}
    <div class="actions-row">
      <button class="btn-action confirm" id="actSave">Mark as Claimed</button>
    </div>`;
  const { close } = modalShell('Manually claim a block', body);
  document.getElementById('actSave').onclick = async () => {
    const n = parseInt(document.getElementById('fNum').value, 10);
    if (!(n >= 1 && n <= 60)){ showFErr('Block must be 1–60.'); return; }
    const donor = readDonorForm();
    const err = validateDonor(donor);
    if (err){ showFErr(err); return; }
    try {
      await setDoc(doc(db, 'blocks', String(n)), {
        amount: n,
        status: 'claimed',
        donor: donor,
        pendingAt: null,
        claimedAt: serverTimestamp()
      });
      close();
    } catch(e){
      showFErr("Couldn't save — " + e.message);
    }
  };
}

function openEditModal(n){
  const data = blocksState.get(n);
  if (!data) return;
  const body = donorFormHtml(data.donor || {}) + `
    <div class="actions-row">
      <button class="btn-action confirm" id="actSave">Save changes</button>
    </div>`;
  const { close } = modalShell(`Edit donor info — Block #${n}`, body);
  document.getElementById('actSave').onclick = async () => {
    const donor = readDonorForm();
    const err = validateDonor(donor);
    if (err){ showFErr(err); return; }
    try {
      await updateDoc(doc(db, 'blocks', String(n)), { donor: donor });
      close();
    } catch(e){
      showFErr("Couldn't save — " + e.message);
    }
  };
}

function validateDonor(d){
  if (!d.firstName) return 'First name required.';
  if (!d.lastName)  return 'Last name required.';
  if (!d.email || !/.+@.+\..+/.test(d.email)) return 'Valid email required.';
  if (!d.phone) return 'Phone required.';
  if (!['venmo','zelle'].includes(d.paymentMethod)) return 'Payment method required.';
  return null;
}

function showFErr(msg){
  const el = document.getElementById('fErr');
  el.hidden = false;
  el.textContent = msg;
}

/* --------- Helpers ------------------------------------ */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s){ return escapeHtml(s); }
```

- [ ] **Step 3: Manual verification**

Run a local server (with the public hosting setup, not the emulator, so it talks to your real Firestore):

```bash
firebase serve --only hosting --port 5050
```

Open http://localhost:5050/admin.html.

Test the sign-in:
- Click **Sign in with Google**.
- Sign in with one of the whitelisted Gmail accounts you added to `config/admins` in Task 10.
- You should land on the dashboard with stats showing 0/0/0/1830, an empty pending list, and the 60-block admin grid.

Test rejection:
- Sign out. Click sign in. Use a Gmail address NOT on the whitelist.
- You should see "This account (X) is not on the admin list" and be signed back out.

- [ ] **Step 4: Commit**

```bash
git add admin.html admin.js
git commit -m "feat(admin): sign-in, dashboard, pending list, block actions"
```

---

## Phase 6: End-to-End Verification and Deployment

### Task 18: Full end-to-end smoke test against real Firestore

- [ ] **Step 1: Start local server**

```bash
firebase serve --only hosting --port 5050
```

- [ ] **Step 2: Run through the visitor flow in one browser window**

1. Open http://localhost:5050/ — grid should show all 60 available blocks.
2. Click Block #25 — modal opens.
3. Fill out: First name "Test", Last name "Donor", Email "test@example.com", Phone "5551234567", Venmo, leave anonymous unchecked.
4. Click Reserve. You should see the success view with Venmo instructions.
5. Close the modal. Block #25 should now show as **pending** (cream stripes). Hover it — tooltip says "Test".

- [ ] **Step 3: Confirm payment in another tab**

1. Open http://localhost:5050/admin.html in a new tab.
2. Sign in.
3. Block #25 should appear in the Pending list. Click **Confirm Paid**.
4. Switch back to the visitor tab — Block #25 should turn **green** with "Test" beneath the number, within ~1 second, with no refresh.
5. Scoreboard should now show $25 raised, 1/60 claimed, 59 left.

- [ ] **Step 4: Test the race condition**

1. Open the visitor page in two browser windows (or two different browsers).
2. In both windows, click the same available block — both modals open.
3. Submit in window A. Wait for success.
4. Submit in window B with the same block. You should see "Sorry — that one's gone" race-lost view.

- [ ] **Step 5: Test admin actions**

1. From the admin page, click a pending block on the admin grid → action panel opens.
2. Click **Release** → confirm → block returns to available, modal closes.
3. Click an available block → **Manually claim** → fill in donor info → save → block becomes claimed.
4. Click a claimed block → **Edit info** → change something → save → admin grid updates instantly. Verify on the visitor page too.

- [ ] **Step 6: Test anonymous**

1. Visitor reserves Block #50 with the "Anonymous" checkbox checked.
2. Admin confirms paid.
3. Visitor page should show Block #50 as claimed, displaying "Anonymous" (not the actual first name) under the number.

- [ ] **Step 7: Test the all-claimed banner**

This is hard to do for real. To smoke-test the code path, in the admin grid click each non-claimed block and either confirm or manually claim until all 60 are green (or temporarily lower the count by changing `=== 60` in `index.html` to `>= 1` and reload the public page — DON'T forget to change it back).

If you confirmed all 60 for testing, use the admin **Release** action on each to reset before deploying.

### Task 19: Deploy

- [ ] **Step 1: Sanity-check what will deploy**

The `firebase.json` ignore list excludes `docs/`, `seed.html`, `.md` files, etc. Verify by running:

```bash
firebase deploy --only hosting --dry-run 2>&1 | head -40
```

If anything sensitive shows up, add it to the ignore list.

- [ ] **Step 2: Deploy hosting + rules**

```bash
firebase deploy
```

You should see "Deploy complete!" and a hosting URL like `https://road-to-fargo-a1b2c.web.app`.

- [ ] **Step 3: Smoke-test the live site**

Visit the hosting URL. Walk through Task 18 Step 2 again — but **on Block #1 only** (use the smallest amount, then release it from admin to keep the page clean before going live).

### Task 20: Connect your custom domain

- [ ] **Step 1: Open Hosting in the Firebase Console**

Console → **Build → Hosting** → **Add custom domain**.

- [ ] **Step 2: Enter your domain**

Type your domain (e.g., `roadtofargo.com` or whatever you own). Firebase will show you two DNS records to add.

- [ ] **Step 3: Add the DNS records at your registrar**

Log in to wherever you bought the domain (GoDaddy, Namecheap, Google Domains, etc.). Add the two `A` records (or one `A` + one `TXT` for verification) that Firebase displays.

DNS propagation usually takes minutes but can take up to 48 hours. Firebase auto-provisions an SSL certificate once verification completes.

- [ ] **Step 4: Verify**

Once the Firebase Console shows "Connected", open your domain in a browser. You should see the site over HTTPS.

### Task 21: Tighten security & monitoring

- [ ] **Step 1: Re-verify the production security rules**

In the Firebase Console → Firestore → Rules tab, confirm the rules match `firestore.rules` (the one from Task 8, NOT the temporary "allow all" from seeding). If they don't:

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 2: Add your authorized domain to Auth**

Firebase Console → Authentication → Settings → Authorized domains. Add your custom domain (e.g., `roadtofargo.com`). The default `*.web.app` and `*.firebaseapp.com` are already there.

- [ ] **Step 3: Manual rules audit**

Try to break the rules from DevTools (just so you know it's locked down). In the visitor page, open the browser console and try:

```js
// Should fail
const m = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
const { db } = await import("./firebase-init.js");
await m.updateDoc(m.doc(db, 'blocks', '1'), { status: 'claimed' });
```

You should see a "PERMISSION_DENIED" error in the console. Good — the rules are protecting you.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production deploy + custom domain config"
```

---

## Done

The site is live with:
- Visitors self-reserving blocks → block grays out instantly for everyone
- Admin confirms payment → block turns green with first name
- Admin can release, edit, or manually claim any block
- No automated emails, no auto-release — you're the manual gate
- Google sign-in + email whitelist + Firestore rules guard the admin actions

## Self-Review (verified before saving)

- [x] Spec coverage: every section (architecture, data model, visitor flow, admin flow, security rules, error handling, testing) maps to at least one task.
- [x] No `TBD`, `TODO`, or "implement later" placeholders.
- [x] Code blocks are full, copy-pasteable — no `…` ellipses standing in for code.
- [x] File paths are absolute or relative-to-project-root consistently.
- [x] Status transitions match across visitor + admin flows (`available` ⇄ `pending` ⇄ `claimed`).
- [x] Auto-release is explicitly absent everywhere (per user's "manual gate" decision); the "24h" message is only a soft nudge in the success modal.
- [x] Type/field names consistent: `donor.firstName`, `donor.lastName`, `donor.email`, `donor.phone`, `donor.paymentMethod`, `donor.anonymous`, `pendingAt`, `claimedAt`, `amount`, `status`.
