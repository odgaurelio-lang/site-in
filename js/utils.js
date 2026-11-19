// =============================================
// RYO INVESTMENT PLATFORM - UTILITIES (utils.js)
// =============================================

const API_BASE = (window.location.protocol === 'file:' || window.location.port === '5500')
  ? 'http://localhost:3000'
  : '';

/**
 * Formater un montant en "X FCFA" avec séparateurs d'espaces
 */
function formatCFA(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('fr-FR') + ' FCFA';
}

/**
 * Formater une date ISO en français
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Echapper le HTML (protection anti-XSS DOM)
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Masquer un numero de telephone pour l'anonymat des transactions (ex: "+225 •••• ••89")
 */
function maskAnonPhone(phone) {
  const s = String(phone || '').trim();
  if (!s || s === '-' || s.includes('••')) return s || 'Confidentiel';
  const clean = s.replace(/\s+/g, '');
  if (clean.length <= 4) return '••••';
  const prefix = clean.startsWith('+') ? clean.slice(0, 4) : clean.slice(0, 2);
  const suffix = clean.slice(-2);
  return `${prefix} •••• ••${suffix}`;
}

/**
 * Masquer une reference de transaction pour l'anonymat (ex: "ANON-••••345")
 */
function maskAnonRef(ref) {
  const s = String(ref || '').trim();
  if (!s || s === '-') return 'ANON-••••';
  if (s.startsWith('ANON-')) return s;
  return `ANON-••••${s.slice(-3).toUpperCase()}`;
}

/**
 * Masquer le nom d'un investisseur dans les tableaux de parrainage / commissions
 */
function maskAnonUser(name, id = null) {
  const s = String(name || '').trim();
  if (!s) return 'Actionnaire (N•••)';
  if (s.includes('•••')) return s;
  const init = s.charAt(0).toUpperCase();
  return id ? `Actionnaire #${id} (${init}•••)` : `Actionnaire (${init}•••)`;
}

/**
 * Nettoyer toute description de transaction pour masquer numeros et references
 */
function maskAnonDescription(desc) {
  let s = String(desc || '').trim();
  if (!s) return '';
  s = s.replace(/\+?\d[\d\s]{6,18}\d/g, m => maskAnonPhone(m));
  s = s.replace(/(Orange Money\s*:\s*|Moov Money\s*:\s*|Réf\s*:\s*)([A-Za-z0-9._-]{4,})/gi, (_, p1, p2) => `${p1}${maskAnonRef(p2)}`);
  return s;
}

/**
 * Lire le JWT depuis localStorage
 */
function getToken() {
  return localStorage.getItem('ryo_token');
}

/**
 * Sauvegarder le JWT et les infos user dans localStorage
 */
function setAuth(token, user) {
  if (token) localStorage.setItem('ryo_token', token);
  if (user) localStorage.setItem('ryo_user', JSON.stringify(user));
}

/**
 * Récupérer l'utilisateur courant depuis localStorage
 */
function getUser() {
  try {
    const raw = localStorage.getItem('ryo_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Déconnexion complète
 */
function logoutUser() {
  localStorage.removeItem('ryo_token');
  localStorage.removeItem('ryo_user');
  window.location.href = 'login.html';
}

/**
 * Vérifier la présence du JWT et rediriger vers login.html si absent
 */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Appel API générique avec header Authorization Bearer
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (response.status === 401 || response.status === 403) {
    if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/register') {
      localStorage.removeItem('ryo_token');
      localStorage.removeItem('ryo_user');
      window.location.href = 'login.html';
      throw new Error(data.error || data.message || 'Session expirée, veuillez vous reconnecter.');
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erreur (${response.status})`);
  }

  return data;
}

/**
 * Afficher une alerte stylisée dans #alertContainer ou en haut de page
 */
function showAlert(msg, type = 'danger', containerId = 'alertContainer') {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '3000';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
  }

  const icons = {
    success: '<i class="bi bi-check-circle-fill"></i>',
    danger: '<i class="bi bi-exclamation-triangle-fill"></i>',
    warning: '<i class="bi bi-exclamation-circle-fill"></i>',
    info: '<i class="bi bi-info-circle-fill"></i>'
  };

  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.innerHTML = `
    <span class="alert-icon">${icons[type] || '<i class="bi bi-info-circle-fill"></i>'}</span>
    <div style="flex:1">${msg}</div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:700;margin-left:0.5rem" aria-label="Fermer"><i class="bi bi-x-lg"></i></button>
  `;

  container.innerHTML = '';
  container.appendChild(alertEl);

  setTimeout(() => {
    if (alertEl && alertEl.parentElement) {
      alertEl.remove();
    }
  }, 5000);
}

/**
 * Initialiser la sidebar mobile et infos utilisateur sur les pages dashboard
 */
function initDashboardLayout() {
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = user.username || user.name || user.email || 'Investisseur Nike';
    if (avatarEl) {
      const initial = (user.username || user.name || user.email || 'N').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
    if (Number(user.is_admin) === 1) {
      const nav = document.querySelector('.sidebar-nav');
      if (nav && !document.getElementById('adminNavLink')) {
        const a = document.createElement('a');
        a.id = 'adminNavLink';
        a.href = 'admin/index.html';
        a.className = 'sidebar-nav-item';
        a.innerHTML = '<span class="nav-icon"><i class="bi bi-shield-lock"></i></span><span>Administration</span>';
        nav.insertBefore(a, nav.querySelector('.logout-trigger'));
      }
    }
  }

  const mobileBtn = document.getElementById('mobileMenuBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  }

  if (mobileBtn) mobileBtn.addEventListener('click', toggleSidebar);
  if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // Boutons de déconnexion
  document.querySelectorAll('.logout-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  });
}
