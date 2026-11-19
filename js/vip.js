// =============================================
// NIKE - ACTIONS & PACK (vip.js)
// Orange Money Payment
// =============================================

const SHARES_MAP = {
  1: { shares: 1, label: "PRIX D'1 ACTION" },
  2: { shares: 5, label: "PRIX DE 5 ACTIONS" },
  3: { shares: 10, label: "PRIX DE 10 ACTIONS" },
  4: { shares: 15, label: "PRIX DE 15 ACTIONS" },
  5: { shares: 30, label: "PRIX DE 30 ACTIONS" },
  6: { shares: 50, label: "PRIX DE 50 ACTIONS" },
  7: { shares: 75, label: "PRIX DE 75 ACTIONS" },
  8: { shares: 150, label: "PRIX DE 150 ACTIONS" },
  9: { shares: 400, label: "PRIX DE 400 ACTIONS" },
  10: { shares: 700, label: "PRIX DE 700 ACTIONS" }
};

const FALLBACK_VIP_PLANS = [
  { level: 1,  price: 4000,   daily_revenue: 600,    total_revenue: 90000,    duration: 150, shares: 1,   shares_label: "PRIX D'1 ACTION" },
  { level: 2,  price: 7000,   daily_revenue: 1050,   total_revenue: 157500,   duration: 150, shares: 5,   shares_label: "PRIX DE 5 ACTIONS" },
  { level: 3,  price: 12000,  daily_revenue: 1800,   total_revenue: 270000,   duration: 150, shares: 10,  shares_label: "PRIX DE 10 ACTIONS" },
  { level: 4,  price: 18000,  daily_revenue: 2700,   total_revenue: 405000,   duration: 150, shares: 15,  shares_label: "PRIX DE 15 ACTIONS" },
  { level: 5,  price: 35000,  daily_revenue: 5250,   total_revenue: 787500,   duration: 150, shares: 30,  shares_label: "PRIX DE 30 ACTIONS" },
  { level: 6,  price: 50000,  daily_revenue: 7500,   total_revenue: 1125000,  duration: 150, shares: 50,  shares_label: "PRIX DE 50 ACTIONS" },
  { level: 7,  price: 70000,  daily_revenue: 10500,  total_revenue: 1575000,  duration: 150, shares: 75,  shares_label: "PRIX DE 75 ACTIONS" },
  { level: 8,  price: 150000, daily_revenue: 22500,  total_revenue: 3375000,  duration: 150, shares: 150, shares_label: "PRIX DE 150 ACTIONS" },
  { level: 9,  price: 400000, daily_revenue: 60000,  total_revenue: 9000000,  duration: 150, shares: 400, shares_label: "PRIX DE 400 ACTIONS" },
  { level: 10, price: 700000, daily_revenue: 105000, total_revenue: 15750000, duration: 150, shares: 700, shares_label: "PRIX DE 700 ACTIONS" }
];

let currentSubscriptionId = null;
let selectedPlan = null;
let selectedOperator = 'orange_money';
let smsPollingTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initDashboardLayout();

  await Promise.all([
    loadUserBalance(),
    loadVipPlans(),
    loadMySubscriptions()
  ]);

  const confirmForm = document.getElementById('confirmPaymentForm');
  if (confirmForm) {
    confirmForm.addEventListener('submit', handleConfirmPayment);
  }

  const closeModalBtn = document.getElementById('closeSubscribeModal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSubscribeModal);
  }
});

async function loadUserBalance() {
  try {
    const res = await apiCall('/api/user/balance');
    const bal = res.balance ?? 0;
    const topbarBal = document.getElementById('topbarBalance');
    if (topbarBal) topbarBal.textContent = formatCFA(bal);
  } catch (e) {
    // Ignore
  }
}

/**
 * Charger les 10 actions en vente depuis /api/vip/plans
 */
async function loadVipPlans() {
  let plans = FALLBACK_VIP_PLANS;
  try {
    const res = await apiCall('/api/vip/plans');
    const apiPlans = Array.isArray(res) ? res : (res.plans || []);
    if (apiPlans.length > 0) {
      plans = apiPlans;
    }
  } catch (err) {
    plans = FALLBACK_VIP_PLANS;
  }

  renderMemberActionsTable(plans);
  renderVipCards(plans);
}

const SNEAKER_MODELS = {
  1: "Nike Revolution 7 Essential",
  2: "Nike Air Force 1 '07",
  3: "Air Jordan 1 Retro High",
  4: "Nike Dunk Low Retro",
  5: "Nike Air Max 97 Metallic",
  6: "Nike ZoomX Vaporfly",
  7: "Nike Air Max Plus TN",
  8: "Air Jordan 4 Retro Élite",
  9: "Nike Alphafly 3 Marathon",
  10: "Nike Edition Limitée Élite"
};

/**
 * Générer le tableau éditorial « Actions & Pack » dans l'espace membre
 */
function renderMemberActionsTable(plans) {
  const tbody = document.getElementById('memberVipTableBody');
  if (!tbody) return;

  tbody.innerHTML = plans.map(plan => {
    const level = plan.level || plan.vip_level;
    const price = Number(plan.price);
    const daily = Number(plan.daily_revenue || plan.daily);
    const total = Number(plan.total_revenue || plan.total || (daily * 150));
    const duration = plan.duration || 150;
    const isFeatured = level === 5 || level === 8;
    const shareInfo = SHARES_MAP[level] || { label: (plan.shares_label || `PRIX ACTION ${level}`).toUpperCase(), shares: level };
    const roi = Math.round((total / price - 1) * 100);
    const indexStr = String(level).padStart(2, '0');

    return `
      <tr class="${isFeatured ? 'ap-row-featured' : ''}">
        <td>
          <div class="ap-pack-cell">
            <span class="ap-pack-index">${indexStr}</span>
            <div class="ap-pack-thumb">
              <img src="images/action-${level}.jpg" alt="Action ${level}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="ap-pack-info">
              <div class="ap-pack-title-row">
                <span class="ap-action-name">ACTION ${level}</span>
                ${isFeatured ? '<span class="ap-popular-badge">POPULAIRE</span>' : ''}
              </div>
              <span class="ap-shares-label">${shareInfo.label}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="ap-price-val">${price.toLocaleString('fr-FR')}</span><span class="ap-currency">FCFA</span>
        </td>
        <td>
          <div class="ap-daily-wrap">
            <span class="ap-daily-val">${daily.toLocaleString('fr-FR')}</span><span class="ap-currency">FCFA</span>
          </div>
        </td>
        <td>
          <div class="ap-total-wrap">
            <span class="ap-total-dot" aria-hidden="true"></span>
            <span class="ap-total-val">${total.toLocaleString('fr-FR')}</span><span class="ap-currency">FCFA</span>
          </div>
        </td>
        <td class="col-center">
          <span class="ap-duration-chip">${duration} jours</span>
        </td>
        <td class="col-center">
          <span class="ap-roi-badge">+${roi}%</span>
        </td>
        <td class="col-right">
          <button type="button" class="ap-action-btn" onclick="initiateSubscription(${level}, ${price}, ${daily}, ${total})">
            <span>ACHETER</span>
            <i class="bi bi-arrow-right"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Générer dynamiquement les 10 cartes d'actions
 */
function renderVipCards(plans) {
  const grid = document.getElementById('vipCardsGrid');
  if (!grid) return;

  grid.innerHTML = plans.map(plan => {
    const level = plan.level || plan.vip_level;
    const price = plan.price;
    const daily = plan.daily_revenue || plan.daily;
    const total = plan.total_revenue || plan.total || (daily * 150);
    const duration = plan.duration || 150;
    const isFeatured = level === 5 || level === 8;
    const shareInfo = SHARES_MAP[level] || { label: plan.shares_label || `Pack Action ${level}`, shares: level };
    const modelName = SNEAKER_MODELS[level] || `Nike Performance Élite ${level}`;

    return `
      <div class="vip-card ${isFeatured ? 'vip-card-featured' : ''}">
        ${isFeatured ? '<span class="featured-tag">Populaire</span>' : ''}
        
        <div class="vip-card-img-wrap">
          <img src="images/action-${level}.jpg" alt="Action ${level} - ${modelName}" loading="lazy" onerror="this.style.display='none'">
        </div>

        <div class="vip-card-header">
          <div>
            <div class="vip-card-title">ACTION ${level}</div>
            <div style="font-size:0.78rem;color:var(--nike-gray-500);margin-top:2px;">${modelName}</div>
          </div>
          <div class="vip-card-crown">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M24 7.635c-.156.408-.54 1.144-1.152 2.208-1.56 2.712-4.14 5.388-7.74 8.028-3.6 2.64-7.584 4.356-11.952 5.148-1.008.18-1.884.096-2.628-.252-.744-.348-1.224-.9-1.44-1.656-.216-.756-.096-1.596.36-2.52.456-.924 1.212-1.896 2.268-2.916 2.376-2.292 5.544-4.272 9.504-5.94 3.96-1.668 7.98-2.676 12.06-3.024.288.24.528.552.72.936z"/>
            </svg>
          </div>
        </div>

        <div class="vip-card-price">
          ${Number(price).toLocaleString('fr-FR')} <span class="currency">FCFA</span>
        </div>
        <div class="vip-card-shares-sub">
          <span class="vip-badge ${isFeatured ? 'vip-badge-gold' : 'vip-badge-red'}">${shareInfo.label}</span>
        </div>

        <div class="vip-card-stats">
          <div class="vip-stat">
            <div class="vip-stat-label">Dividende / Jour</div>
            <div class="vip-stat-value">${formatCFA(daily)}</div>
          </div>
          <div class="vip-stat">
            <div class="vip-stat-label">Rendement (150j)</div>
            <div class="vip-stat-value" style="color:var(--nike-green)">${formatCFA(total)}</div>
          </div>
        </div>

        <div class="vip-card-desc">
          <i class="bi bi-clock-history"></i> Contrat : <strong>${duration} jours</strong> (+2150%)
        </div>

        <div class="vip-card-actions">
          <button class="btn-nike-pill-black w-100" style="justify-content:center;" onclick="initiateSubscription(${level}, ${price}, ${daily}, ${total})">
            Acheter Action ${level}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Sélectionner l'opérateur de paiement (Orange Money)
 */
function selectPaymentOperator(op) {
  selectedOperator = 'orange_money';

  const tabOrange = document.getElementById('tabOrangeMoney');
  const hiddenInput = document.getElementById('selectedOperator');
  const refLabel = document.getElementById('paymentRefLabel');

  if (hiddenInput) hiddenInput.value = selectedOperator;
  if (tabOrange) tabOrange.className = 'operator-tab active-orange';
  if (refLabel) refLabel.textContent = 'Trans ID (ID de transaction Orange Money) *';
}

/**
 * Ouvrir la modal d'achat et appeler POST /api/vip/subscribe
 */
async function initiateSubscription(level, price, daily, total) {
  if (!requireAuth()) return;

  const shareInfo = SHARES_MAP[level] || { label: `Action ${level}` };
  selectedPlan = { level, price, daily, total, label: shareInfo.label };

  const modal = document.getElementById('subscribeModal');
  const modalTitle = document.getElementById('modalVipTitle');
  const modalAmount = document.getElementById('modalAmount');
  const modalDaily = document.getElementById('modalDaily');
  const modalTotal = document.getElementById('modalTotal');
  const paymentRefInput = document.getElementById('paymentRef');

  if (modalTitle) modalTitle.textContent = `Acheter Action ${level} — ${shareInfo.label}`;
  if (modalAmount) modalAmount.textContent = formatCFA(price);
  if (modalDaily) modalDaily.textContent = formatCFA(daily);
  if (modalTotal) modalTotal.textContent = formatCFA(total);
  if (paymentRefInput) paymentRefInput.value = '';
  const payerPhoneInput = document.getElementById('payerPhone');
  if (payerPhoneInput) payerPhoneInput.value = '';
  const waitNotice = document.getElementById('smsWaitNotice');
  if (waitNotice) waitNotice.classList.add('hidden');
  stopSmsPolling();

  selectPaymentOperator('orange_money');

  if (modal) modal.classList.remove('hidden');

  try {
    const res = await apiCall('/api/vip/subscribe', 'POST', {
      vip_level: level,
      level: level
    });

    currentSubscriptionId = res.subscription_id || res.subscription?.id || res.id;
  } catch (err) {
    showAlert(err.message || 'Erreur lors de l\'initialisation de la commande.', 'danger');
  }
}

function stopSmsPolling() {
  if (smsPollingTimer) {
    clearInterval(smsPollingTimer);
    smsPollingTimer = null;
  }
}

function startSmsPolling(subId) {
  stopSmsPolling();
  let attempts = 0;
  smsPollingTimer = setInterval(async () => {
    attempts++;
    if (attempts > 15 || !currentSubscriptionId) {
      stopSmsPolling();
      return;
    }
    try {
      const st = await apiCall(`/api/vip/subscription-status/${subId}`);
      if (st.status === 'active') {
        stopSmsPolling();
        closeSubscribeModal();
        showAlert(`Paiement vérifié automatiquement ! Votre Action ${st.vip_level} est maintenant active.`, 'success');
        await Promise.all([loadMySubscriptions(), loadUserBalance()]);
      }
    } catch (e) {}
  }, 4000);
}

function closeSubscribeModal() {
  stopSmsPolling();
  const modal = document.getElementById('subscribeModal');
  if (modal) modal.classList.add('hidden');
  currentSubscriptionId = null;
  selectedPlan = null;
}

/**
 * Confirmer le paiement via POST /api/vip/confirm-payment
 */
async function handleConfirmPayment(e) {
  e.preventDefault();

  const paymentRef = document.getElementById('paymentRef')?.value.trim();
  const payerPhone = document.getElementById('payerPhone')?.value.trim() || '';
  const operator = document.getElementById('selectedOperator')?.value || selectedOperator;
  const submitBtn = document.getElementById('confirmPaymentBtn');
  const waitNotice = document.getElementById('smsWaitNotice');
  const waitText = document.getElementById('smsWaitText');

  if (!paymentRef || paymentRef.length < 4) {
    showAlert('Veuillez entrer le Trans ID de votre transaction Orange Money.', 'danger');
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Vérification...';
  }

  try {
    if (!currentSubscriptionId && selectedPlan) {
      const subRes = await apiCall('/api/vip/subscribe', 'POST', {
        vip_level: selectedPlan.level,
        level: selectedPlan.level
      });
      currentSubscriptionId = subRes.subscription_id || subRes.subscription?.id || subRes.id;
    }

    const confirmRes = await apiCall('/api/vip/confirm-payment', 'POST', {
      subscription_id: currentSubscriptionId,
      payment_ref: paymentRef,
      payer_phone: payerPhone,
      payment_method: operator
    });

    if (confirmRes.status === 'active') {
      closeSubscribeModal();
      showAlert(confirmRes.message || 'Paiement vérifié automatiquement ! Votre Action est maintenant active.', 'success');
      await Promise.all([loadMySubscriptions(), loadUserBalance()]);
    } else {
      if (waitNotice) waitNotice.classList.remove('hidden');
      if (waitText) waitText.textContent = confirmRes.message || 'Trans ID enregistré. En attente de réception du SMS Orange Money...';
      showAlert(confirmRes.message || 'Trans ID enregistré. En attente du SMS Orange Money...', 'info');
      startSmsPolling(currentSubscriptionId);
      await loadMySubscriptions();
    }
  } catch (err) {
    showAlert(err.message || 'Erreur lors de la vérification du paiement.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

/**
 * Charger les actions détenues par l'utilisateur
 */
async function loadMySubscriptions() {
  const tbody = document.getElementById('mySubscriptionsBody');
  if (!tbody) return;

  try {
    const res = await apiCall('/api/vip/my-subscriptions');
    const subs = Array.isArray(res) ? res : (res.subscriptions || []);

    if (subs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding:1.8rem;color:var(--nike-gray-500)">
            Vous ne possédez aucune action pour le moment.
          </td>
        </tr>
      `;
      return;
    }

    const statusBadge = {
      active: '<span class="badge badge-success">Actif</span>',
      pending: '<span class="badge badge-warning">En attente</span>',
      expired: '<span class="badge badge-secondary">Terminé</span>',
      rejected: '<span class="badge badge-danger">Rejeté</span>'
    };

    tbody.innerHTML = subs.map(s => {
      const level = s.vip_level || s.level;
      const shareInfo = SHARES_MAP[level] || { label: `Action ${level}` };
      const opBadge = '<span class="badge badge-orange" style="margin-right:0.35rem;">Orange</span>';

      const safeRef = s.payment_ref
        ? `<span style="font-family:monospace;">${escHtml(maskAnonRef(s.payment_ref))}</span>`
        : '<span style="color:var(--nike-gray-500)">Confidentiel</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:700;color:var(--nike-black);">ACTION ${Number(level)}</div>
            <div style="font-size:0.75rem;color:var(--nike-gray-500);">${escHtml(shareInfo.label)}</div>
          </td>
          <td style="font-weight:700;color:var(--nike-black)">${formatCFA(s.price)}</td>
          <td style="color:var(--nike-black);font-weight:700">${formatCFA(s.daily_revenue || s.daily)}</td>
          <td>${opBadge}${safeRef}</td>
          <td>${statusBadge[s.status] || escHtml(s.status)}</td>
          <td>${formatDate(s.created_at)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    // Ignore
  }
}
