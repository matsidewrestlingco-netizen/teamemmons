import { db, auth } from "../firebase-init.js";
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
  const allowed = await isWhitelisted(user.email);
  if (!allowed){
    signinErr.hidden = false;
    signinErr.textContent = "This account (" + user.email + ") is not on the admin list.";
    await signOut(auth);
    return;
  }
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
  whoBar.hidden = true;
  dashScreen.hidden = true;
  signinScreen.hidden = false;
}

/* --------- Live data ---------------------------------- */
function startListening(){
  unsubscribe = onSnapshot(collection(db, 'blocks_michael'), (snap) => {
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
  for (const [, data] of blocksState){
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
    .filter(([, d]) => d.status === 'pending')
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
  let n = null;
  for (let i = 1; i <= 60; i++){
    if ((blocksState.get(i)?.status || 'available') === 'available'){ n = i; break; }
  }
  if (n == null){ alert('No available blocks left.'); return; }
  openManualClaimModal(n);
});

/* --------- Actions ------------------------------------ */
async function confirmBlock(n){
  await updateDoc(doc(db, 'blocks_michael', String(n)), {
    status: 'claimed',
    claimedAt: serverTimestamp()
  });
}
async function releaseBlock(n){
  if (!confirm(`Release Block #${n} back to available?`)) return;
  await setDoc(doc(db, 'blocks_michael', String(n)), {
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
        <label class="radio"><input type="radio" name="fM" value="check" ${prefill.paymentMethod === 'check' ? 'checked' : ''}> Check or Cash</label>
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
      await setDoc(doc(db, 'blocks_michael', String(n)), {
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
      await updateDoc(doc(db, 'blocks_michael', String(n)), { donor: donor });
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
  if (!['venmo','zelle','check'].includes(d.paymentMethod)) return 'Payment method required.';
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
