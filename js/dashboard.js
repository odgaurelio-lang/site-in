// =============================================
// NIKE - DASHBOARD (dashboard.js)
// =============================================

const DASHBOARD_SHARES_MAP = {
  1: "Prix d'1 Action",
  2: "Prix de 5 Actions",
  3: "Prix de 10 Actions",
  4: "Prix de 15 Actions",
  5: "Prix de 30 Actions",
  6: "Prix de 50 Actions",
  7: "Prix de 75 Actions",
  8: "Prix de 150 Actions",
  9: "Prix de 400 Actions",
  10: "Prix de 700 Actions"
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initDashboardLayout();

  await Promise.all([
    loadDashboardData(),
    loadRecentTransactions(),
    loadProfileModalData()
  ]);
});

/**
 * Charger les statistiques et actions actives depuis /api/user/dashboard
 */
async function loadDashboardData() {
  try {
    const data = await apiCall('/api/user/dashboard');

    const balance = data.balance ?? data.user?.balance ?? 0;
    const dailyRevenue = data.daily_revenue_today ?? data.dailyRevenue ?? 0;
    const activeSubs = Array.isArray(data.active_subscriptions)
      ? data.active_subscriptions
      : (Array.isArray(data.subscriptions) ? data.subscriptions : []);
    const referralCount = data.referral_count ?? data.referrals ?? 0;

    // Topbar & Stat Cards
    const topbarBal = document.getElementById('topbarBalance');
    const statBal = document.getElementById('statBalance');
    const statDaily = document.getElementById('statDailyRevenue');
    const statActivePlan = document.getElementById('statActivePlan');
    const statReferrals = document.getElementById('statReferrals');

    if (topbarBal) topbarBal.textContent = formatCFA(balance);
    if (statBal) statBal.textContent = formatCFA(balance);
    if (statDaily) statDaily.textContent = formatCFA(dailyRevenue);

    if (statActivePlan) {
      if (activeSubs.length > 0) {
        const highestLevel = Math.max(...activeSubs.map(s => Number(s.vip_level || s.level || 1)));
        statActivePlan.textContent = `Action ${highestLevel} (${activeSubs.length} active${activeSubs.length > 1 ? 's' : ''})`;
      } else if (typeof data.active_subscriptions === 'number' && data.active_subscriptions > 0) {
        statActivePlan.textContent = `${data.active_subscriptions} active(s)`;
      } else {
        statActivePlan.textContent = 'Aucune action';
      }
    }

    if (statReferrals) statReferrals.textContent = `${referralCount} partenaire(s)`;

    let subscriptionsList = activeSubs;
    if (!Array.isArray(data.active_subscriptions)) {
      try {
        const subRes = await apiCall('/api/vip/my-subscriptions');
        subscriptionsList = Array.isArray(subRes) ? subRes : (subRes.subscriptions || []);
      } catch (e) {
        subscriptionsList = [];
      }
    }

    renderActivePlans(subscriptionsList);
  } catch (err) {
    showAlert(err.message || 'Impossible de charger les données du tableau de bord.', 'danger');
  }
}

/**
 * Afficher les actions actives avec progression du contrat (150 jours)
 */
function renderActivePlans(subscriptions) {
  const container = document.getElementById('activePlansContainer');
  if (!container) return;

  if (!subscriptions || subscriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M24 7.635c-.156.408-.54 1.144-1.152 2.208-1.56 2.712-4.14 5.388-7.74 8.028-3.6 2.64-7.584 4.356-11.952 5.148-1.008.18-1.884.096-2.628-.252-.744-.348-1.224-.9-1.44-1.656-.216-.756-.096-1.596.36-2.52.456-.924 1.212-1.896 2.268-2.916 2.376-2.292 5.544-4.272 9.504-5.94 3.96-1.668 7.98-2.676 12.06-3.024.288.24.528.552.72.936z"/>
          </svg>
        </div>
        <div class="empty-state-title">Aucune action active pour le moment</div>
        <p class="empty-state-desc">Achetez vos premières actions Nike et commencez à percevoir vos dividendes quotidiens garantis pendant 150 jours.</p>
        <a href="vip-plans.html" class="btn-ryo"><i class="bi bi-bag-check me-2"></i> Voir les actions en vente</a>
      </div>
    `;
    return;
  }

  container.innerHTML = subscriptions.map(sub => {
    const level = sub.vip_level || sub.level || 1;
    const shareSub = DASHBOARD_SHARES_MAP[level] || `Action ${level}`;
    const daily = sub.daily_revenue || sub.daily || 0;
    const totalDays = sub.duration || 150;
    const total = sub.total_revenue || sub.total || (daily * totalDays);
    const status = sub.status || 'active';

    let daysElapsed = 0;
    let daysRemaining = totalDays;

    if (sub.start_date) {
      const start = new Date(sub.start_date);
      const now = new Date();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      daysElapsed = Math.max(0, Math.min(totalDays, diffDays));
      daysRemaining = Math.max(0, totalDays - daysElapsed);
    } else if (sub.end_date) {
      const end = new Date(sub.end_date);
      const now = new Date();
      const rem = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, Math.min(totalDays, rem));
      daysElapsed = totalDays - daysRemaining;
    }

    const progressPercent = status === 'pending'
      ? 5
      : Math.min(100, Math.max(5, Math.round((daysElapsed / totalDays) * 100)));

    const badgeMap = {
      active: '<span class="badge badge-success">Active</span>',
      pending: '<span class="badge badge-warning">En attente de validation</span>',
      expired: '<span class="badge badge-secondary">Terminée</span>',
      rejected: '<span class="badge badge-danger">Rejetée</span>'
    };

    return `
      <div class="subscription-card" style="display:flex;gap:1.1rem;align-items:center;">
        <img src="images/action-${level}.jpg" style="width:72px;height:60px;border-radius:8px;object-fit:cover;border:1px solid var(--nike-gray-200);flex-shrink:0;" alt="Action ${level}" onerror="this.style.display='none'">
        <div style="flex:1;min-width:0;">
          <div class="sub-header" style="margin-bottom:0.4rem;">
            <div class="sub-title">
              <span class="vip-level-badge">Action ${level}</span>
              <span style="font-size:0.75rem;color:var(--nike-gray-500);text-transform:uppercase;">${shareSub}</span>
              ${badgeMap[status] || `<span class="badge badge-info">${status}</span>`}
            </div>
            <div class="sub-daily">
              Dividende : <strong>${formatCFA(daily)} / jour</strong>
            </div>
          </div>
          <div class="sub-progress-label">
            <span>Progression (${daysElapsed}/${totalDays} jours)</span>
            <span>${status === 'pending' ? 'Activation en cours' : `${daysRemaining} jours restants`}</span>
          </div>
          <div class="progress-bar-ryo">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Charger l'historique des transactions récentes
 */
async function loadRecentTransactions() {
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;

  try {
    const res = await apiCall('/api/user/transactions?limit=20');
    const transactions = Array.isArray(res) ? res : (res.transactions || []);

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="padding: 2.2rem; color: var(--gray);">
            Aucune transaction enregistrée pour le moment.
          </td>
        </tr>
      `;
      return;
    }

    const typeLabels = {
      bonus: { label: 'Bonus de bienvenue', icon: '<i class="bi bi-gift"></i>', positive: true },
      earning: { label: 'Dividende quotidien Action', icon: '<i class="bi bi-graph-up-arrow"></i>', positive: true },
      commission: { label: 'Commission parrainage', icon: '<i class="bi bi-people"></i>', positive: true },
      referral: { label: 'Commission parrainage', icon: '<i class="bi bi-people"></i>', positive: true },
      deposit: { label: 'Achat Action', icon: '<i class="bi bi-bag-check"></i>', positive: false },
      withdrawal: { label: 'Retrait de fonds', icon: '<i class="bi bi-cash-stack"></i>', positive: false },
      refund: { label: 'Remboursement retrait', icon: '<i class="bi bi-arrow-repeat"></i>', positive: true }
    };

    tbody.innerHTML = transactions.map(tx => {
      const tInfo = typeLabels[tx.type] || { label: tx.type || 'Transaction', icon: '<i class="bi bi-credit-card"></i>', positive: tx.amount >= 0 };
      const sign = tInfo.positive ? '+' : '-';
      const amountClass = tInfo.positive ? 'tx-amount-positive' : 'tx-amount-negative';
      const safeDesc = escHtml(maskAnonDescription(tx.description || tInfo.label));
      const safeRef = escHtml(maskAnonRef(tx.reference));

      return `
        <tr>
          <td>
            <div class="tx-row">
              <div class="tx-icon ${tInfo.positive ? 'icon-green' : 'icon-gold'}">${tInfo.icon}</div>
              <div class="tx-info">
                <div class="tx-label">${safeDesc}</div>
                <div class="tx-date">${formatDate(tx.created_at)} • <span style="color:var(--nike-gray-500)"><i class="bi bi-shield-lock"></i> Anonyme</span></div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-secondary">${escHtml((tx.type || 'op').toUpperCase())}</span></td>
          <td class="${amountClass}">${sign}${formatCFA(Math.abs(tx.amount || 0))}</td>
          <td style="color:var(--nike-gray-500);font-size:0.8rem;font-family:monospace;">${safeRef}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger" style="padding:1.5rem">
          Impossible de charger les transactions.
        </td>
      </tr>
    `;
  }
}

/**
 * Charger le profil utilisateur pour affichage sidebar & modal profil
 */
async function loadProfileModalData() {
  try {
    const res = await apiCall('/api/user/profile');
    const user = res.user || res;
    if (user && user.email) {
      setAuth(getToken(), user);
      initDashboardLayout();

      const profName = document.getElementById('profileName');
      const profEmail = document.getElementById('profileEmail');
      const profPhone = document.getElementById('profilePhone');
      const profCode = document.getElementById('profileRefCode');

      if (profName) profName.textContent = user.username || '-';
      if (profEmail) profEmail.textContent = user.email || '-';
      if (profPhone) profPhone.textContent = user.phone || '-';
      if (profCode) profCode.textContent = user.alt_referral_code ? `${user.referral_code} (Alternatif: ${user.alt_referral_code})` : (user.referral_code || '-');

      const dashRef = document.getElementById('dashRefCode');
      const dashAltWrap = document.getElementById('dashAltRefWrap');
      const dashAlt = document.getElementById('dashAltRefCode');
      const dashCopy = document.getElementById('dashCopyCodeBtn');
      if (dashRef) dashRef.textContent = user.referral_code || '-';
      if (user.alt_referral_code && dashAltWrap && dashAlt) {
        dashAlt.textContent = user.alt_referral_code;
        dashAltWrap.classList.remove('hidden');
      }
      if (dashCopy) {
        dashCopy.onclick = () => {
          const codeToCopy = user.alt_referral_code || user.referral_code || '';
          navigator.clipboard?.writeText(codeToCopy).catch(() => {});
          showAlert(`Code de parrainage copié : ${codeToCopy}`, 'success');
        };
      }
    }
  } catch (e) {
    // Silencieux si l'endpoint n'est pas encore prêt
  }
}
