// =============================================
// RYO INVESTMENT - PWA & NATIVE EXPERIENCE (pwa.js v2.0)
// Installation Native Android/iOS/Desktop + Mode Hors-Ligne + Barre Mobile
// =============================================

let deferredPrompt = null;

function isAppStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// 1. Enregistrement du Service Worker + détection de mise à jour
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});
  });
}

// 2. Capture de l'événement natif d'installation (Chrome, Edge, Android, Samsung Internet)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const dismissedTime = localStorage.getItem('ryo_pwa_dismissed');
  const now = Date.now();
  if (!isAppStandalone() && (!dismissedTime || (now - Number(dismissedTime)) > 7 * 24 * 60 * 60 * 1000)) {
    showInstallBanner();
  }

  syncInstallButtons();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideInstallBanner();
  closeInstallGuideModal();
  syncInstallButtons();
  if (typeof showAlert === 'function') {
    showAlert('Application RYO VIP installée avec succès sur votre appareil !', 'success');
  }
});

function syncInstallButtons() {
  const standalone = isAppStandalone();
  document.querySelectorAll('.btn-install-app').forEach((btn) => {
    if (standalone) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
      btn.onclick = (e) => {
        e.preventDefault();
        triggerNativeInstall();
      };
    }
  });
}

function triggerNativeInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        hideInstallBanner();
      }
      deferredPrompt = null;
    });
  } else {
    showUniversalInstallModal();
  }
}

function showInstallBanner() {
  if (isAppStandalone()) return;
  let banner = document.getElementById('pwaInstallBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <div class="pwa-banner-icon">
          <img src="/icons/icon-192.png" alt="RYO VIP" width="40" height="40" style="border-radius:10px;">
        </div>
        <div class="pwa-banner-text">
          <div style="font-weight:700;font-size:0.85rem;color:var(--white,#fff);">Installer l'application RYO VIP</div>
          <div style="font-size:0.72rem;color:var(--gray,#aaa);">Accès rapide plein écran &amp; suivi 15%/jour</div>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn-ryo" id="pwaBannerInstallBtn" style="padding:0.35rem 0.85rem;font-size:0.75rem;">
          Installer
        </button>
        <button type="button" id="pwaBannerCloseBtn" aria-label="Fermer" style="background:none;border:none;color:var(--gray,#aaa);font-size:1.1rem;cursor:pointer;padding:0 0.3rem;">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwaBannerInstallBtn')?.addEventListener('click', triggerNativeInstall);
    document.getElementById('pwaBannerCloseBtn')?.addEventListener('click', () => {
      localStorage.setItem('ryo_pwa_dismissed', String(Date.now()));
      hideInstallBanner();
    });
  } else {
    banner.classList.remove('hidden');
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
}

// 3. Modal d'installation guidée universel (iOS Safari, Android Chrome, Desktop Chrome/Edge)
function showUniversalInstallModal() {
  if (isAppStandalone()) {
    if (typeof showAlert === 'function') {
      showAlert('Vous utilisez déjà l\'application RYO VIP en mode installé.', 'info');
    }
    return;
  }

  closeInstallGuideModal();
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  let stepsHtml = '';
  if (isIos) {
    stepsHtml = `
      <p style="color:#ccc;font-size:0.88rem;margin-bottom:0.9rem;">Pour installer <strong>RYO VIP</strong> sur votre iPhone ou iPad :</p>
      <ol style="text-align:left;color:#e0e0e0;font-size:0.86rem;line-height:1.7;padding-left:1.2rem;margin-bottom:1.2rem;">
        <li>Touchez l'icône <strong>Partager</strong> <i class="bi bi-box-arrow-up"></i> dans la barre Safari.</li>
        <li>Faites défiler le menu et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.</li>
        <li>Touchez <strong>Ajouter</strong> en haut à droite.</li>
      </ol>
    `;
  } else if (isAndroid) {
    stepsHtml = `
      <p style="color:#ccc;font-size:0.88rem;margin-bottom:0.9rem;">Pour installer <strong>RYO VIP</strong> sur votre téléphone Android :</p>
      <ol style="text-align:left;color:#e0e0e0;font-size:0.86rem;line-height:1.7;padding-left:1.2rem;margin-bottom:1.2rem;">
        <li>Ouvrez le menu du navigateur <i class="bi bi-three-dots-vertical"></i> en haut à droite.</li>
        <li>Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
        <li>Confirmez en appuyant sur <strong>Installer</strong>.</li>
      </ol>
    `;
  } else {
    stepsHtml = `
      <p style="color:#ccc;font-size:0.88rem;margin-bottom:0.9rem;">Pour installer <strong>RYO VIP</strong> sur votre ordinateur ou mobile :</p>
      <ol style="text-align:left;color:#e0e0e0;font-size:0.86rem;line-height:1.7;padding-left:1.2rem;margin-bottom:1.2rem;">
        <li>Cliquez sur l'icône d'installation <i class="bi bi-download"></i> à droite de la barre d'adresse de Chrome ou Edge.</li>
        <li>Ou ouvrez le menu du navigateur <i class="bi bi-three-dots-vertical"></i> puis cliquez sur <strong>« Installer RYO Investment »</strong>.</li>
      </ol>
    `;
  }

  const overlay = document.createElement('div');
  overlay.id = 'ryoPwaGuideModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(5px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="background:#141414;border:1px solid rgba(192,57,43,0.45);border-radius:16px;max-width:420px;width:100%;padding:1.6rem;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.8);color:#fff;">
      <img src="/icons/icon-192.png" alt="RYO VIP" width="56" height="56" style="border-radius:14px;margin-bottom:0.8rem;">
      <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:0.6rem;">Installer l'App RYO VIP (PWA)</h3>
      ${stepsHtml}
      <button type="button" id="closePwaGuideBtn" style="width:100%;padding:0.75rem;border-radius:50px;border:none;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;font-weight:700;cursor:pointer;">
        Compris
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('closePwaGuideBtn')?.addEventListener('click', closeInstallGuideModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeInstallGuideModal();
  });
}

function closeInstallGuideModal() {
  document.getElementById('ryoPwaGuideModal')?.remove();
}

// 4. Indicateur Réseau Hors-Ligne / En Ligne
function setupNetworkIndicator() {
  const showNetStatus = (online) => {
    let bar = document.getElementById('ryoNetStatusBar');
    if (online) {
      if (bar) {
        bar.style.background = '#1b5e20';
        bar.textContent = 'Connexion Internet rétablie';
        setTimeout(() => bar?.remove(), 2500);
      }
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ryoNetStatusBar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10001;background:#b71c1c;color:#fff;text-align:center;font-size:0.78rem;font-weight:700;padding:6px 12px;';
      bar.textContent = 'Mode hors-ligne : certaines actions nécessitent une connexion Internet';
      document.body.appendChild(bar);
    }
  };

  window.addEventListener('offline', () => showNetStatus(false));
  window.addEventListener('online', () => showNetStatus(true));
}

// 5. Barre de navigation mobile basse pour l'espace membre
document.addEventListener('DOMContentLoaded', () => {
  initMobileBottomNav();
  syncInstallButtons();
  setupNetworkIndicator();

  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const dismissedTime = localStorage.getItem('ryo_pwa_dismissed');
  if (isIos && !isAppStandalone() && (!dismissedTime || (Date.now() - Number(dismissedTime)) > 7 * 86400000)) {
    setTimeout(showInstallBanner, 2500);
  }
});

function initMobileBottomNav() {
  if (document.querySelector('.mobile-bottom-nav')) return;
  const isDashboardPage = ['dashboard.html', 'vip-plans.html', 'withdraw.html', 'referral.html'].some(p => window.location.pathname.endsWith(p));
  if (!isDashboardPage) return;

  const currentPath = window.location.pathname;
  let activeTab = 'dashboard';
  if (currentPath.includes('vip-plans')) activeTab = 'vip';
  else if (currentPath.includes('withdraw')) activeTab = 'withdraw';
  else if (currentPath.includes('referral')) activeTab = 'referral';

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Navigation mobile');
  nav.innerHTML = `
    <a href="dashboard.html" class="mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}">
      <i class="bi bi-speedometer2"></i>
      <span>Accueil</span>
    </a>
    <a href="vip-plans.html" class="mobile-bottom-nav-item ${activeTab === 'vip' ? 'active' : ''}">
      <i class="bi bi-gem"></i>
      <span>Plans VIP</span>
    </a>
    <a href="withdraw.html" class="mobile-bottom-nav-item ${activeTab === 'withdraw' ? 'active' : ''}">
      <i class="bi bi-cash-stack"></i>
      <span>Retraits</span>
    </a>
    <a href="referral.html" class="mobile-bottom-nav-item ${activeTab === 'referral' ? 'active' : ''}">
      <i class="bi bi-people"></i>
      <span>Filleuls</span>
    </a>
    <a href="#profile" class="mobile-bottom-nav-item" onclick="openProfileFromNav(); return false;">
      <i class="bi bi-person-circle"></i>
      <span>Profil</span>
    </a>
  `;

  document.body.appendChild(nav);
}

function openProfileFromNav() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) {
    profileModal.classList.remove('hidden');
  } else {
    window.location.href = 'dashboard.html#profileModal';
  }
}
