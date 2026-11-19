/* ========================================
   RYO ADMIN - admin.js
   Toutes les fonctions partagées admin
======================================== */

const API_BASE = (window.location.protocol === 'file:' || window.location.port === '5500')
  ? 'http://localhost:3000/api'
  : '/api';

// ========================================
// AUTH
// ========================================
function getToken() {
  return localStorage.getItem('ryo_token');
}

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getUser() {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const storedRaw = localStorage.getItem('ryo_user');
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    return { ...stored, ...(payload || {}) };
  } catch {
    return null;
  }
}

function showAdminLoginOverlay(errorMsg = '') {
  if (document.getElementById('adminLoginOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'adminLoginOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:radial-gradient(ellipse at top,#2a0808,#0a0a0a 70%);display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="background:#141414;border:1px solid rgba(231,76,60,0.35);border-radius:16px;max-width:420px;width:100%;padding:2.2rem;box-shadow:0 20px 60px rgba(0,0,0,0.8);color:#fff;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#c0392b,#e74c3c);display:inline-flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:0.8rem;">
          <i class="bi bi-shield-lock-fill"></i>
        </div>
        <h2 style="font-size:1.45rem;font-weight:800;margin:0;">Administration <span style="color:#e74c3c;">RYO</span></h2>
        <p style="color:#9ca3af;font-size:0.88rem;margin-top:0.35rem;">Connectez-vous avec votre compte administrateur</p>
      </div>
      <div id="adminLoginErr" style="display:${errorMsg ? 'block' : 'none'};background:rgba(231,76,60,0.15);border:1px solid #e74c3c;color:#ff8a80;padding:0.7rem 0.9rem;border-radius:8px;font-size:0.85rem;margin-bottom:1rem;">${escHtml(errorMsg)}</div>
      <form id="adminInlineLoginForm">
        <div style="margin-bottom:1rem;">
          <label style="display:block;font-size:0.82rem;color:#d1d5db;margin-bottom:0.4rem;">Email Administrateur</label>
          <input type="email" id="adminLoginEmail" value="admin@ryo.com" required
            style="width:100%;padding:0.75rem 0.9rem;background:#1f1f1f;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;outline:none;">
        </div>
        <div style="margin-bottom:1.3rem;">
          <label style="display:block;font-size:0.82rem;color:#d1d5db;margin-bottom:0.4rem;">Mot de passe</label>
          <input type="password" id="adminLoginPass" placeholder="Mot de passe admin" required
            style="width:100%;padding:0.75rem 0.9rem;background:#1f1f1f;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;outline:none;">
        </div>
        <button type="submit" id="adminLoginSubmit"
          style="width:100%;padding:0.85rem;background:linear-gradient(135deg,#c0392b,#e74c3c);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;">
          Se connecter à l'Administration
        </button>
      </form>
      <div style="text-align:center;margin-top:1.2rem;">
        <a href="../index.html" style="color:#9ca3af;font-size:0.84rem;text-decoration:none;">← Retour au site</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('adminInlineLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminLoginEmail').value.trim();
    const password = document.getElementById('adminLoginPass').value;
    const errEl = document.getElementById('adminLoginErr');
    const btn = document.getElementById('adminLoginSubmit');
    btn.disabled = true;
    btn.textContent = 'Connexion en cours...';
    errEl.style.display = 'none';
    try {
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Identifiants incorrects');
      if (!data.user || Number(data.user.is_admin) !== 1) {
        throw new Error('Ce compte n\'a pas les droits administrateur.');
      }
      localStorage.setItem('ryo_token', data.token);
      localStorage.setItem('ryo_user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err) {
      errEl.textContent = err.message || 'Impossible de contacter le serveur (vérifiez que npm start est lancé).';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Se connecter à l\'Administration';
    }
  });
}

function checkAdminAuth() {
  const token = getToken();
  if (!token) {
    showAdminLoginOverlay();
    return false;
  }
  const user = getUser();
  if (!user || Number(user.is_admin) !== 1) {
    showAdminLoginOverlay('Veuillez vous connecter avec un compte administrateur.');
    return false;
  }
  const emailEl = document.getElementById('adminEmail');
  if (emailEl) emailEl.textContent = user.email || 'admin@ryo.com';
  return true;
}

function logout() {
  localStorage.removeItem('ryo_token');
  localStorage.removeItem('ryo_user');
  showAdminLoginOverlay();
}

// ========================================
// API CALLS
// ========================================
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, opts);
    if (res.status === 401 || res.status === 403) {
      // Session expiree ou droits retires => deconnexion forcee
      logout();
      throw new Error('Session expirée');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `Erreur ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError') {
      throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
    }
    throw err;
  }
}

// ========================================
// FORMAT HELPERS
// ========================================
function formatCFA(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.floor(amount)) + ' FCFA';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusBadgeHtml(status) {
  const map = {
    pending:  { cls: 'badge-pending',  label: 'En attente' },
    active:   { cls: 'badge-active',   label: 'Actif' },
    rejected: { cls: 'badge-rejected', label: 'Rejeté' },
    expired:  { cls: 'badge-expired',  label: 'Expiré' },
    approved: { cls: 'badge-approved', label: 'Approuvé' },
  };
  const s = map[status] || { cls: 'badge-expired', label: status };
  return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

function vipBadgeHtml(level) {
  return `<span class="vip-badge"><i class="bi bi-stack"></i> Action ${level}</span>`;
}

// ========================================
// TOASTS / NOTIFICATIONS
// ========================================
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showToast(title, message, type = 'info', duration = 5000) {
  ensureToastContainer();
  const iconMap = {
    success: 'bi-check-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    error:   'bi-x-circle-fill',
    info:    'bi-info-circle-fill'
  };
  const icon = iconMap[type] || 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = `admin-toast toast-${type}`;
  el.innerHTML = `
    <i class="bi ${icon} toast-icon"></i>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  toastContainer.appendChild(el);
  if (duration > 0) {
    setTimeout(() => {
      el.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
}

function showAlert(msg, type = 'info') {
  showToast(type === 'success' ? 'Succès' : type === 'error' || type === 'danger' ? 'Erreur' : 'Info', msg, type === 'danger' ? 'error' : type);
}

// ========================================
// SOUND NOTIFICATION
// ========================================
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// ========================================
// CONFIRMATION DIALOG
// ========================================
function confirmAction(message, onConfirm) {
  // Utiliser le modal Bootstrap
  const modalHtml = `
    <div class="modal fade" id="confirmModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>Confirmation</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p style="color: var(--text-secondary); margin:0; font-size:15px;">${message}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
            <button type="button" class="btn btn-danger" id="confirmBtn">Confirmer</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Supprimer modal existant
  const existing = document.getElementById('confirmModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));

  document.getElementById('confirmBtn').addEventListener('click', () => {
    modal.hide();
    onConfirm();
  });

  document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('confirmModal')?.remove();
  });

  modal.show();
}

// ========================================
// LOAD ADMIN STATS
// ========================================
async function loadAdminStats() {
  try {
    const data = await apiCall('/admin/stats');
    const s = data.stats || data;

    setStatValue('statUsers', s.users_count ?? s.total_users ?? 0);
    setStatValue('statSubs', s.active_subscriptions ?? 0);
    setStatValue('statWithdrawals', s.pending_withdrawals ?? 0);
    setStatValue('statInvested', formatCFA(s.total_invested ?? 0));

    // Badge rouge sur retraits si > 0
    const wBadge = document.getElementById('withdrawalsBadge');
    if (wBadge) {
      const count = s.pending_withdrawals ?? 0;
      wBadge.textContent = count;
      wBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Update sidebar nav badge
    const navBadge = document.getElementById('navWithdrawalBadge');
    if (navBadge) {
      const count = s.pending_withdrawals ?? 0;
      navBadge.textContent = count;
      navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

  } catch (err) {
    console.error('Stats error:', err);
    showToast('Erreur', 'Impossible de charger les statistiques: ' + err.message, 'error');
  }
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ========================================
// LOAD PENDING SUBSCRIPTIONS
// ========================================
async function loadPendingSubscriptions() {
  const container = document.getElementById('pendingSubsContainer');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner"><div class="spinner-ring"></div><p>Chargement...</p></div>`;

  try {
    const data = await apiCall('/admin/subscriptions?status=all');
    const subs = data.subscriptions || data;

    // Update count badge
    const countEl = document.getElementById('pendingSubsCount');
    if (countEl) countEl.textContent = subs.filter(s => s.status === 'active' || s.status === 'pending').length;

    if (!subs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-check2-circle"></i>
          <p>Aucune souscription</p>
        </div>
      `;
      return;
    }

    const rows = subs.map(s => {
      const opBadge = s.payment_method === 'moov_money'
        ? '<span class="badge-moov-operator" style="margin-right:4px;">Moov</span>'
        : '<span class="badge-orange-operator" style="margin-right:4px;">Orange</span>';

      return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar-sm">${getInitials(s.username || s.email)}</div>
            <div>
              <div class="user-name">${escHtml(s.username || 'N/A')}</div>
              <div class="user-email">${escHtml(s.email || '')}</div>
            </div>
          </div>
        </td>
        <td>${vipBadgeHtml(s.vip_level)} ${statusBadgeHtml(s.status)}</td>
        <td class="amount-cell">${formatCFA(s.price)}</td>
        <td>${opBadge}<span class="ref-cell">${escHtml(s.payment_ref || 'Non fourni')}</span></td>
        <td class="date-cell">${formatDate(s.created_at)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${s.status === 'pending' ? `
              <button class="btn-action btn-activate" onclick="activateSubscription(${s.id})">
                <i class="bi bi-check-lg"></i> Activer
              </button>` : ''}
            ${s.status !== 'rejected' ? `
              <button class="btn-action btn-reject" onclick="rejectSubscription(${s.id})">
                <i class="bi bi-x-lg"></i> ${s.status === 'active' ? 'Annuler' : 'Rejeter'}
              </button>` : '<span style="color:var(--text-muted);font-size:0.8rem;">Rejetée</span>'}
          </div>
        </td>
      </tr>
    `;
    }).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Action & Pack</th>
              <th>Montant</th>
              <th>Réf. Paiement</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-circle"></i>
        <p style="color:var(--danger);">Erreur: ${escHtml(err.message)}</p>
      </div>
    `;
  }
}

// ========================================
// LOAD SMS DEPOSITS (ORANGE MONEY AUTO-CHECK)
// ========================================
async function loadSmsDeposits() {
  const container = document.getElementById('smsDepositsContainer');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner"><div class="spinner-ring"></div><p>Chargement...</p></div>`;

  try {
    const data = await apiCall('/admin/sms-deposits?limit=50');
    const deposits = data.deposits || [];
    const countEl = document.getElementById('smsDepositsCount');
    if (countEl) countEl.textContent = deposits.length;

    if (!deposits.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-chat-left-text"></i>
          <p>Aucun SMS Orange Money reçu pour le moment</p>
        </div>
      `;
      return;
    }

    const rows = deposits.map(d => {
      const badge = d.status === 'matched'
        ? `<span class="badge-active">Associé${d.vip_level ? ` (Action ${d.vip_level})` : ''}</span>`
        : `<span class="badge-pending">En attente client</span>`;

      return `
        <tr>
          <td class="ref-cell">${escHtml(d.trans_id)}</td>
          <td class="amount-cell">${formatCFA(d.amount)}</td>
          <td style="font-family:monospace;font-size:13px;">${escHtml(d.sender_phone || '-')}</td>
          <td>${badge}${d.username ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escHtml(d.username)}</div>` : ''}</td>
          <td class="date-cell">${formatDate(d.received_at)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Trans ID</th>
              <th>Montant</th>
              <th>Expéditeur</th>
              <th>Statut</th>
              <th>Reçu le</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-circle"></i>
        <p style="color:var(--danger);">Erreur: ${escHtml(err.message)}</p>
      </div>
    `;
  }
}

// ========================================
// ACTIVATE / REJECT SUBSCRIPTION
// ========================================
async function activateSubscription(id) {
  confirmAction(
    `Êtes-vous sûr de vouloir <strong>activer</strong> cette souscription ?<br>
     L'utilisateur recevra ses revenus quotidiens dès demain.`,
    async () => {
      try {
        await apiCall(`/admin/subscriptions/${id}/activate`, 'PUT');
        showToast('Succès', 'Souscription activée avec succès!', 'success');
        await Promise.all([loadAdminStats(), loadPendingSubscriptions()]);
      } catch (err) {
        showToast('Erreur', 'Échec activation: ' + err.message, 'error');
      }
    }
  );
}

async function rejectSubscription(id) {
  confirmAction(
    `Êtes-vous sûr de vouloir <strong>rejeter</strong> cette souscription ?<br>
     Cette action est irréversible.`,
    async () => {
      try {
        await apiCall(`/admin/subscriptions/${id}/reject`, 'PUT');
        showToast('Succès', 'Souscription rejetée.', 'warning');
        await Promise.all([loadAdminStats(), loadPendingSubscriptions()]);
      } catch (err) {
        showToast('Erreur', 'Échec rejet: ' + err.message, 'error');
      }
    }
  );
}

// ========================================
// LOAD PENDING WITHDRAWALS
// ========================================
let _prevWithdrawalCount = 0;

async function loadPendingWithdrawals() {
  const container = document.getElementById('pendingWithdrawalsContainer');
  if (!container) return;

  container.innerHTML = `<div class="loading-spinner"><div class="spinner-ring"></div><p>Chargement...</p></div>`;

  try {
    const data = await apiCall('/admin/withdrawals?status=all');
    const wds = data.withdrawals || data;
    const pendingList = wds.filter(w => w.status === 'pending');

    // Count badge
    const countEl = document.getElementById('pendingWithdrawalsCount');
    if (countEl) countEl.textContent = pendingList.length;

    // Notification si nouveaux items
    if (pendingList.length > _prevWithdrawalCount && _prevWithdrawalCount >= 0 && document.visibilityState !== undefined) {
      if (pendingList.length > _prevWithdrawalCount) {
        playNotificationSound();
        showToast('Nouveaux retraits', `${pendingList.length - _prevWithdrawalCount} nouveau(x) retrait(s) en attente!`, 'warning');
        // Flash title
        flashPageTitle('Retraits en attente!');
      }
    }
    _prevWithdrawalCount = pendingList.length;

    if (!wds.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-check2-circle"></i>
          <p>Aucun retrait enregistré</p>
        </div>
      `;
      return;
    }

    const rows = wds.map(w => {
      const opBadge = w.payment_method === 'moov_money'
        ? '<span class="badge-moov-operator" style="margin-right:6px;">Moov</span>'
        : '<span class="badge-orange-operator" style="margin-right:6px;">Orange</span>';

      const amt = Number(w.amount || 0);
      const fee = Number(w.fee_amount || Math.round(amt * 0.10));
      const net = Number(w.net_amount || (amt - fee));

      return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar-sm">${getInitials(w.username || w.email)}</div>
            <div>
              <div class="user-name">${escHtml(w.username || 'N/A')}</div>
              <div class="user-email">${escHtml(w.email || '')}</div>
            </div>
          </div>
        </td>
        <td class="amount-cell">
          <div>${formatCFA(amt)} ${statusBadgeHtml(w.status)}</div>
          <div style="font-size:11px;color:#2ecc71;margin-top:2px;">Net à verser : ${formatCFA(net)} (Frais 10% : ${formatCFA(fee)})</div>
        </td>
        <td style="font-family:monospace; font-size:13px; color:var(--text-secondary);">${opBadge}${escHtml(w.phone_number || 'N/A')}</td>
        <td class="date-cell">${formatDate(w.created_at)}</td>
        <td>
          ${w.status === 'pending' ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn-action btn-approve" onclick="processWithdrawal(${w.id}, 'approved')">
                <i class="bi bi-check-lg"></i> Approuver
              </button>
              <button class="btn-action btn-reject" onclick="processWithdrawal(${w.id}, 'rejected')">
                <i class="bi bi-x-lg"></i> Rejeter
              </button>
            </div>
          ` : `<span style="color:var(--text-muted);font-size:0.8rem;">${w.status === 'approved' ? 'Payé' : 'Remboursé'}</span>`}
        </td>
      </tr>
    `;
    }).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Montant</th>
              <th>Numéro Orange Money</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-exclamation-circle"></i>
        <p style="color:var(--danger);">Erreur: ${escHtml(err.message)}</p>
      </div>
    `;
  }
}

// ========================================
// PROCESS WITHDRAWAL
// ========================================
async function processWithdrawal(id, action) {
  const label = action === 'approved' ? 'approuver' : 'rejeter';
  const msg = action === 'approved'
    ? `Confirmer le <strong>paiement</strong> de ce retrait via Orange Money ?<br>Assurez-vous d'avoir effectué le transfert.`
    : `Êtes-vous sûr de vouloir <strong>rejeter</strong> ce retrait ?<br>Le montant sera remboursé à l'utilisateur.`;

  confirmAction(msg, async () => {
    try {
      await apiCall(`/admin/withdrawals/${id}/process`, 'PUT', { action });
      const successMsg = action === 'approved'
        ? 'Retrait approuvé! Le paiement est confirmé.'
        : 'Retrait rejeté. Montant remboursé à l\'utilisateur.';
      showToast('Succès', successMsg, 'success');
      await Promise.all([loadAdminStats(), loadPendingWithdrawals()]);
    } catch (err) {
      showToast('Erreur', `Échec ${label}: ` + err.message, 'error');
    }
  });
}

// ========================================
// AUTO-REFRESH
// ========================================
let _autoRefreshInterval = null;
let _refreshCountdown = 30;

function startAutoRefresh(refreshFn, intervalSeconds = 30) {
  if (_autoRefreshInterval) clearInterval(_autoRefreshInterval);

  updateRefreshTimer(intervalSeconds);
  _refreshCountdown = intervalSeconds;

  const countdownInterval = setInterval(() => {
    _refreshCountdown--;
    updateRefreshTimer(_refreshCountdown);
    if (_refreshCountdown <= 0) _refreshCountdown = intervalSeconds;
  }, 1000);

  _autoRefreshInterval = setInterval(async () => {
    _refreshCountdown = intervalSeconds;
    await refreshFn();
    updateLastRefreshTime();
  }, intervalSeconds * 1000);

  window._countdownInterval = countdownInterval;
}

function updateRefreshTimer(seconds) {
  const el = document.getElementById('refreshCountdown');
  if (el) el.textContent = `${seconds}s`;
}

function updateLastRefreshTime() {
  const el = document.getElementById('lastRefreshTime');
  if (el) el.textContent = 'Actualisé à ' + new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
}

// ========================================
// PAGE TITLE FLASH
// ========================================
let _originalTitle = '';
let _flashInterval = null;

function flashPageTitle(msg) {
  if (!_originalTitle) _originalTitle = document.title;
  if (_flashInterval) clearInterval(_flashInterval);

  let show = true;
  _flashInterval = setInterval(() => {
    document.title = show ? msg : _originalTitle;
    show = !show;
  }, 1000);

  setTimeout(() => {
    clearInterval(_flashInterval);
    document.title = _originalTitle;
  }, 10000);
}

// ========================================
// ESCAPE HTML
// ========================================
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ========================================
// SIDEBAR TOGGLE (mobile)
// ========================================
function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ========================================
// MANUAL REFRESH BTN
// ========================================
function setupRefreshButton(refreshFn) {
  const btn = document.getElementById('refreshBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    btn.disabled = true;
    try {
      await refreshFn();
      updateLastRefreshTime();
    } finally {
      btn.classList.remove('spinning');
      btn.disabled = false;
    }
  });
}
