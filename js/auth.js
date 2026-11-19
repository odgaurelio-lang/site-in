// =============================================
// RYO INVESTMENT PLATFORM - AUTHENTICATION (auth.js)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Pré-remplir le code de parrainage depuis ?ref=CODE dans l'URL
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');
  const refInput = document.getElementById('referralCode');
  if (refCode && refInput) {
    refInput.value = refCode.trim().toUpperCase();
  }

  // Formulaire d'inscription
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Gestion du sélecteur d'indicatif téléphonique ("Autre...")
  const phoneCodeSelect = document.getElementById('phoneCode');
  const customPhoneCode = document.getElementById('customPhoneCode');
  if (phoneCodeSelect && customPhoneCode) {
    phoneCodeSelect.addEventListener('change', () => {
      if (phoneCodeSelect.value === 'other') {
        customPhoneCode.classList.remove('hidden');
        customPhoneCode.focus();
      } else {
        customPhoneCode.classList.add('hidden');
      }
    });
  }

  // Formulaire de connexion
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Bouton logout éventuel
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
});

/**
 * Gérer l'inscription utilisateur
 */
async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('username')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const rawPhone = document.getElementById('phone')?.value.trim() || '';
  const phoneCodeSel = document.getElementById('phoneCode')?.value || '+226';
  const customCode = document.getElementById('customPhoneCode')?.value.trim() || '';
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  const referralCode = document.getElementById('referralCode')?.value.trim();
  const submitBtn = document.getElementById('registerBtn');

  let dialCode = phoneCodeSel === 'other' ? customCode : phoneCodeSel;
  if (dialCode && !dialCode.startsWith('+')) dialCode = '+' + dialCode;
  if (!/^\+\d{1,4}$/.test(dialCode)) {
    showAlert('Veuillez choisir ou saisir un indicatif pays valide (ex: +226).', 'danger');
    return;
  }

  // Si l'utilisateur n'a pas déjà tapé l'indicatif dans le champ numéro, on l'ajoute
  const cleanLocal = rawPhone.replace(/\s+/g, '');
  const phone = cleanLocal.startsWith('+') ? cleanLocal : `${dialCode}${cleanLocal}`;

  // Validation côté client
  if (!username || username.length < 2) {
    showAlert('Veuillez entrer votre nom complet (minimum 2 caractères).', 'danger');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showAlert('Veuillez entrer une adresse email valide.', 'danger');
    return;
  }

  if (!cleanLocal || !/^\d{6,15}$/.test(cleanLocal.replace(/^\+\d{1,4}/, ''))) {
    showAlert('Veuillez entrer un numéro de téléphone valide après l\'indicatif.', 'danger');
    return;
  }

  if (!password || password.length < 8) {
    showAlert('Le mot de passe doit contenir au moins 8 caractères.', 'danger');
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Les mots de passe ne correspondent pas.', 'danger');
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Création en cours...';
  }

  try {
    const payload = {
      username,
      name: username,
      email,
      phone,
      password,
      referred_by: referralCode || undefined,
      referral_code: referralCode || undefined
    };

    const res = await apiCall('/api/auth/register', 'POST', payload);
    const token = res.token || res.jwt || res.accessToken;
    const user = res.user || { username, email, phone };

    if (token) {
      setAuth(token, user);
      showAlert('Compte créé avec succès ! Redirection...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
    } else {
      showAlert('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    }
  } catch (err) {
    showAlert(err.message || 'Erreur lors de la création du compte.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

/**
 * Gérer la connexion utilisateur
 */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const submitBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    showAlert('Veuillez renseigner votre email et votre mot de passe.', 'danger');
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Connexion...';
  }

  try {
    const res = await apiCall('/api/auth/login', 'POST', { email, password });
    const token = res.token || res.jwt || res.accessToken;
    const user = res.user || { email };

    if (!token) {
      throw new Error('Token d\'authentification manquant dans la réponse.');
    }

    setAuth(token, user);
    showAlert('Connexion réussie ! Redirection vers votre espace...', 'success');

    setTimeout(() => {
      if (user && Number(user.is_admin) === 1) {
        window.location.href = 'admin/index.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    }, 600);
  } catch (err) {
    showAlert(err.message || 'Identifiants incorrects. Veuillez réessayer.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}
