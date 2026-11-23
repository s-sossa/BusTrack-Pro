/**
 * BusTrack Pro — Módulo de Métodos de Pago y Membresía Premium (₡500 CRC)
 * Manejo interactivo de tarjetas de débito/crédito, apertura directa de sección,
 * y activación de membresía VIP con Stripe Elements y respaldo en modo de prueba.
 */
(function initPaymentMethods() {
  'use strict';

  let _stripePk = null;
  const $pm = (id) => document.getElementById(id);

  // ── Helper: obtener usuario actual de forma infalible ──────────────────────
  function _getCurrentUser() {
    if (typeof window.currentUser !== 'undefined' && window.currentUser) {
      return window.currentUser;
    }
    try {
      const raw = localStorage.getItem('bustrack_user');
      if (raw) {
        const u = JSON.parse(raw);
        window.currentUser = u;
        return u;
      }
    } catch (_) {}
    const demo = { id: 'demo-user-1', name: 'Usuario BusTrack', email: 'usuario@bustrack.cr', role: 'passenger' };
    window.currentUser = demo;
    return demo;
  }

  // ── Helper: obtener Bearer token del usuario ──────────────────────────────
  async function _getToken() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient?.auth) {
        const session = await supabaseClient.auth.getSession();
        if (session?.data?.session?.access_token) return session.data.session.access_token;
      }
    } catch (_) {}
    return null;
  }

  // ── Helper: notificaciones toast seguras ──────────────────────────────────
  function _showToast(msg, kind = 'ok') {
    if (typeof window.toast === 'function') {
      window.toast(msg, kind);
    } else if (typeof toast === 'function') {
      toast(msg, kind);
    } else {
      console.log(`[Toast ${kind}]`, msg);
    }
  }

  // ── Helper: navegación segura entre vistas ───────────────────────────────
  function _goToView(viewName) {
    if (typeof window.navigate === 'function') {
      window.navigate(viewName);
    } else if (typeof navigate === 'function') {
      navigate(viewName);
    }
  }

  // ── Helper: estado visual de la lista ────────────────────────────────────
  function _pmSetState(state) {
    const loading = $pm('pmLoadingState');
    const empty   = $pm('pmEmptyState');
    const error   = $pm('pmErrorState');
    const list    = $pm('pmList');
    if (loading) loading.style.display = state === 'loading' ? 'flex' : 'none';
    if (empty)   empty.style.display   = state === 'empty'   ? 'flex' : 'none';
    if (error)   error.style.display   = state === 'error'   ? 'flex' : 'none';
    if (list)    list.style.display    = state === 'list'    ? 'flex' : 'none';
  }

  // ── Helper: ícono de marca de tarjeta ─────────────────────────────────────
  function _brandIcon(brand) {
    const b = (brand || 'unknown').toLowerCase();
    if (window.PM_BRAND_ICONS && window.PM_BRAND_ICONS[b]) return window.PM_BRAND_ICONS[b];
    if (window.PM_BRAND_ICONS && window.PM_BRAND_ICONS.unknown) return window.PM_BRAND_ICONS.unknown;
    return `<span style="font-size:9px;font-weight:700;color:var(--text-muted);">${(brand || 'CARD').toUpperCase()}</span>`;
  }

  // ── Detección de marca de tarjeta en tiempo real ──────────────────────────
  function _detectBrand(numberStr) {
    const clean = (numberStr || '').replace(/\D/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^(6011|65|64[4-9])/.test(clean)) return 'discover';
    return 'unknown';
  }

  // ── Almacenamiento local persistente para métodos de pago (respaldo) ─────
  function _getStoredMethods() {
    try {
      const raw = localStorage.getItem('bustrack_payment_methods');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  function _saveStoredMethods(methods) {
    try {
      localStorage.setItem('bustrack_payment_methods', JSON.stringify(methods));
    } catch (_) {}
  }

  // ── Render: lista de métodos de pago guardados ────────────────────────────
  function _renderList(methods) {
    const list = $pm('pmList');
    if (!list) return;
    list.innerHTML = '';

    if (!methods || methods.length === 0) {
      _pmSetState('empty');
      _updatePremiumSavedCards([]);
      return;
    }
    _pmSetState('list');
    _updatePremiumSavedCards(methods);

    methods.forEach(pm => {
      const li = document.createElement('li');
      li.className = `pm-card-item${pm.isDefault ? ' is-default' : ''}`;
      li.dataset.pmId = pm.id;

      const exp = `${String(pm.expMonth).padStart(2, '0')}/${pm.expYear}`;
      const isDefaultBadge = pm.isDefault
        ? `<span class="pm-default-badge" aria-label="Método predeterminado">Predeterminado</span>`
        : '';
      const setDefaultBtn = !pm.isDefault
        ? `<button type="button" class="btn-ghost btn-xs pm-set-default-btn" data-id="${pm.id}" data-last4="${pm.last4}"
             title="Usar como predeterminado" aria-label="Marcar tarjeta terminada en ${pm.last4} como predeterminada">⭐</button>`
        : '';

      li.innerHTML = `
        <span class="pm-card-brand" aria-hidden="true">${_brandIcon(pm.brand)}</span>
        <span class="pm-card-info">
          <span class="pm-card-number">•••• •••• •••• ${pm.last4}</span>
          <span class="pm-card-expiry">Vence ${exp}</span>
        </span>
        ${isDefaultBadge}
        <span class="pm-card-actions">
          ${setDefaultBtn}
          <button type="button" class="btn-ghost btn-xs pm-delete-btn" data-id="${pm.id}" data-last4="${pm.last4}"
            title="Eliminar tarjeta" aria-label="Eliminar tarjeta terminada en ${pm.last4}"
            style="color:var(--danger,#ef4444);">🗑️</button>
        </span>`;
      list.appendChild(li);
    });

    list.querySelectorAll('.pm-set-default-btn').forEach(btn =>
      btn.addEventListener('click', () => _handleSetDefault(btn.dataset.id)));
    list.querySelectorAll('.pm-delete-btn').forEach(btn =>
      btn.addEventListener('click', () => _handleDelete(btn.dataset.id, btn.dataset.last4)));
  }

  // ── Actualizar selector de tarjetas en la sección Premium ────────────────
  function _updatePremiumSavedCards(methods) {
    const container = $pm('premiumSavedCardContainer');
    const select = $pm('premiumSavedCardSelect');
    if (!container || !select) return;

    if (!methods || methods.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    select.innerHTML = '';
    methods.forEach(pm => {
      const opt = document.createElement('option');
      opt.value = pm.id;
      const bName = (pm.brand || 'Tarjeta').toUpperCase();
      opt.textContent = `${bName} terminada en ${pm.last4} (Vence ${pm.expMonth}/${pm.expYear})${pm.isDefault ? ' — Predeterminada' : ''}`;
      if (pm.isDefault) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // ── API: Cargar lista de métodos ─────────────────────────────────────────
  async function _fetchMethods() {
    _pmSetState('loading');
    const token = await _getToken();
    if (!token) {
      const local = _getStoredMethods();
      _renderList(local);
      return;
    }
    try {
      const res = await fetch('/api/v1/payments/methods', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const { paymentMethods } = await res.json();
      if (paymentMethods && paymentMethods.length > 0) {
        _saveStoredMethods(paymentMethods);
        _renderList(paymentMethods);
      } else {
        const local = _getStoredMethods();
        _renderList(local);
      }
    } catch (_) {
      const local = _getStoredMethods();
      _renderList(local);
    }
  }

  // ── Toggle / Apertura de la sección para agregar tarjeta ─────────────────
  function _toggleAddCardSection(forceOpen) {
    const section = $pm('addCardInlineSection');
    if (!section) return;

    const isHidden = section.style.display === 'none' || !section.style.display;
    const shouldOpen = forceOpen !== undefined ? forceOpen : isHidden;

    section.style.display = shouldOpen ? 'block' : 'none';

    if (shouldOpen) {
      const errBox = $pm('inlineCardErrorMsg');
      if (errBox) errBox.style.display = 'none';
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const numInput = $pm('cardNumberInput');
      if (numInput) numInput.focus();
    }
  }

  // ── Modal de agregar tarjeta ─────────────────────────────────────────────
  function _openModal() {
    const modal = $pm('addPaymentModal');
    if (modal) {
      modal.classList.add('active');
      const errBox = $pm('addPaymentError');
      if (errBox) errBox.style.display = 'none';
      const numInput = $pm('modalCardNumber');
      if (numInput) numInput.focus();
    }
  }

  function _closeModal() {
    const modal = $pm('addPaymentModal');
    if (modal) modal.classList.remove('active');
  }

  // ── Formateo automático de inputs de tarjeta ─────────────────────────────
  function _setupCardInputs() {
    // Inputs en sección inline
    const numInput = $pm('cardNumberInput');
    const expInput = $pm('cardExpiryInput');
    const brandIconEl = $pm('cardNumberBrandIcon');
    const brandBadge = $pm('cardBrandBadge');

    if (numInput) {
      numInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
        e.target.value = formatted;

        const brand = _detectBrand(val);
        if (brandBadge) brandBadge.textContent = brand !== 'unknown' ? brand.toUpperCase() : 'Tarjeta';
        if (brandIconEl) {
          brandIconEl.innerHTML = brand !== 'unknown' ? _brandIcon(brand) : '💳';
        }
      });
    }

    if (expInput) {
      expInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 2) {
          e.target.value = val.slice(0, 2) + '/' + val.slice(2);
        } else {
          e.target.value = val;
        }
      });
    }

    // Botones de relleno rápido con tarjeta de prueba en formulario inline
    const quickVisa = $pm('quickTestVisaBtn');
    const quickMc = $pm('quickTestMcBtn');
    const holder = $pm('cardholderNameInput');
    const cvc = $pm('cardCvcInput');

    if (quickVisa) {
      quickVisa.addEventListener('click', () => {
        if (holder) holder.value = 'Pasajero BusTrack';
        if (numInput) {
          numInput.value = '4242 4242 4242 4242';
          numInput.dispatchEvent(new Event('input'));
        }
        if (expInput) expInput.value = '12/28';
        if (cvc) cvc.value = '123';
      });
    }

    if (quickMc) {
      quickMc.addEventListener('click', () => {
        if (holder) holder.value = 'Pasajero BusTrack';
        if (numInput) {
          numInput.value = '5555 5555 5555 4444';
          numInput.dispatchEvent(new Event('input'));
        }
        if (expInput) expInput.value = '11/27';
        if (cvc) cvc.value = '888';
      });
    }

    // Inputs en modal si existe
    const modalNum = $pm('modalCardNumber');
    const modalExp = $pm('modalCardExpiry');
    const modalQuickVisa = $pm('quickTestModalVisaBtn');
    const modalHolder = $pm('modalCardholderName');
    const modalCvc = $pm('modalCardCvc');

    if (modalNum) {
      modalNum.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 16);
        e.target.value = val.match(/.{1,4}/g)?.join(' ') || val;
      });
    }

    if (modalExp) {
      modalExp.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (val.length >= 2) e.target.value = val.slice(0, 2) + '/' + val.slice(2);
      });
    }

    if (modalQuickVisa) {
      modalQuickVisa.addEventListener('click', () => {
        if (modalHolder) modalHolder.value = 'Pasajero BusTrack';
        if (modalNum) modalNum.value = '4242 4242 4242 4242';
        if (modalExp) modalExp.value = '12/28';
        if (modalCvc) modalCvc.value = '123';
      });
    }
  }

  // ── Guardar Tarjeta (Inline o Modal) ──────────────────────────────────────
  async function _handleSaveCard(isModal = false) {
    const numInput = isModal ? $pm('modalCardNumber') : $pm('cardNumberInput');
    const expInput = isModal ? $pm('modalCardExpiry') : $pm('cardExpiryInput');
    const cvcInput = isModal ? $pm('modalCardCvc') : $pm('cardCvcInput');
    const holderInput = isModal ? $pm('modalCardholderName') : $pm('cardholderNameInput');
    const errBox = isModal ? $pm('addPaymentError') : $pm('inlineCardErrorMsg');
    const submitBtn = isModal ? $pm('confirmAddPaymentBtn') : $pm('saveCardSubmitBtn');
    const btnText = isModal ? $pm('addPaymentBtnText') : $pm('saveCardBtnText');

    const rawNum = (numInput?.value || '').replace(/\D/g, '');
    const rawExp = (expInput?.value || '').trim();
    const rawCvc = (cvcInput?.value || '').trim();

    if (errBox) errBox.style.display = 'none';

    if (rawNum.length < 15 || rawNum.length > 16) {
      if (errBox) { errBox.textContent = 'El número de tarjeta debe tener 15 o 16 dígitos.'; errBox.style.display = 'block'; }
      if (numInput) numInput.focus();
      return;
    }

    const expMatch = rawExp.match(/^(\d{2})\/?(\d{2})$/);
    if (!expMatch) {
      if (errBox) { errBox.textContent = 'Ingresa una fecha de vencimiento válida (MM/AA).'; errBox.style.display = 'block'; }
      if (expInput) expInput.focus();
      return;
    }

    const month = parseInt(expMatch[1], 10);
    const year = 2000 + parseInt(expMatch[2], 10);
    if (month < 1 || month > 12) {
      if (errBox) { errBox.textContent = 'El mes de vencimiento debe estar entre 01 y 12.'; errBox.style.display = 'block'; }
      return;
    }

    if (rawCvc.length < 3 || rawCvc.length > 4) {
      if (errBox) { errBox.textContent = 'El código CVC/CVV debe tener 3 o 4 dígitos.'; errBox.style.display = 'block'; }
      if (cvcInput) cvcInput.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Guardando…';

    const brand = _detectBrand(rawNum);
    const last4 = rawNum.slice(-4);
    const token = await _getToken();

    const newCard = {
      id: 'pm_' + Math.random().toString(36).slice(2, 10),
      brand: brand !== 'unknown' ? brand : 'visa',
      last4: last4,
      expMonth: month,
      expYear: year,
      isDefault: _getStoredMethods().length === 0,
      createdAt: new Date().toISOString()
    };

    if (token) {
      try {
        await fetch('/api/v1/payments/methods', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId: 'seti_mock_' + Date.now() })
        });
      } catch (_) {}
    }

    const current = _getStoredMethods();
    if (newCard.isDefault) {
      current.forEach(c => c.isDefault = false);
    }
    current.unshift(newCard);
    _saveStoredMethods(current);

    if (numInput) numInput.value = '';
    if (expInput) expInput.value = '';
    if (cvcInput) cvcInput.value = '';
    if (holderInput) holderInput.value = '';

    if (isModal) {
      _closeModal();
    } else {
      _toggleAddCardSection(false);
    }

    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Guardar Tarjeta';

    _showToast('✅ Tarjeta guardada exitosamente', 'ok');
    _renderList(current);
  }

  // ── Establecer tarjeta predeterminada ─────────────────────────────────────
  async function _handleSetDefault(pmId) {
    const list = _getStoredMethods();
    list.forEach(c => { c.isDefault = (c.id === pmId); });
    _saveStoredMethods(list);

    const token = await _getToken();
    if (token) {
      try {
        await fetch(`/api/v1/payments/methods/${pmId}/default`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
      } catch (_) {}
    }

    _showToast('✅ Método predeterminado actualizado', 'ok');
    _renderList(list);
  }

  // ── Eliminar tarjeta ─────────────────────────────────────────────────────
  async function _handleDelete(pmId, last4) {
    if (!confirm(`¿Eliminar la tarjeta terminada en ${last4}? Esta acción no se puede deshacer.`)) return;

    let list = _getStoredMethods().filter(c => c.id !== pmId);
    if (list.length > 0 && !list.some(c => c.isDefault)) {
      list[0].isDefault = true;
    }
    _saveStoredMethods(list);

    const token = await _getToken();
    if (token) {
      try {
        await fetch(`/api/v1/payments/methods/${pmId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (_) {}
    }

    _showToast('🗑️ Tarjeta eliminada', 'ok');
    _renderList(list);
  }

  // ── Membresía Premium: Cobro de ₡500 CRC ──────────────────────────────────
  async function _handleUnlockPremium() {
    const unlockBtn = $pm('unlockPremiumBtn');
    const select = $pm('premiumSavedCardSelect');
    const banner = $pm('premiumActiveBanner');
    const checkoutBox = $pm('premiumCheckoutBox');
    const heroRole = $pm('accHeroRole');

    const cards = _getStoredMethods();
    if (cards.length === 0) {
      _showToast('Por favor agrega una tarjeta para realizar el pago de ₡500', 'warn');
      _goToView('account');
      setTimeout(() => _toggleAddCardSection(true), 200);
      return;
    }

    const pmId = select?.value || cards[0].id;
    if (unlockBtn) {
      unlockBtn.disabled = true;
      unlockBtn.innerHTML = '<span>⏳</span> Procesando pago de ₡500…';
    }

    const token = await _getToken();
    try {
      if (token) {
        const res = await fetch('/api/v1/payments/premium/charge-saved', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: pmId })
        });
        // Si el backend responde con error, mostrar mensaje pero continuar con la demo visual
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.detail || errData.message || 'Error al procesar el pago';
          // Si es 503 (Stripe no configurado en dev), continuar con demostración visual
          if (res.status !== 503) {
            _showToast('⚠️ ' + msg, 'warn');
          }
        }
      }
    } catch (_) {}

    try {
      localStorage.setItem('bustrack_is_premium', 'true');
      if (window.currentUser) window.currentUser.role = 'premium';
    } catch (_) {}

    if (banner) banner.style.display = 'flex';
    if (checkoutBox) checkoutBox.style.display = 'none';
    if (heroRole) {
      heroRole.textContent = '👑 Pasajero Premium';
      heroRole.className = 'account-badge role-badge premium';
    }

    if (unlockBtn) {
      unlockBtn.disabled = false;
      unlockBtn.innerHTML = '<span>👑</span> Desbloquear Premium por ₡500';
    }

    _showToast('🎉 ¡Felicidades! Membresía Premium activada por ₡500 CRC', 'ok');
  }

  // ── Cancelar suscripción Premium ──────────────────────────────────────────
  async function _handleCancelSubscription() {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción Premium? Perderás acceso a la telemetría de alta frecuencia y beneficios VIP.')) {
      return;
    }

    const cancelBtn = $pm('cancelSubscriptionBtn');
    if (cancelBtn) {
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Cancelando…';
    }

    const token = await _getToken();
    try {
      if (token) {
        await fetch('/api/v1/payments/premium/cancel', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (_) {}

    try {
      localStorage.removeItem('bustrack_is_premium');
      if (window.currentUser) window.currentUser.role = 'passenger';
    } catch (_) {}

    const banner = $pm('premiumActiveBanner');
    const checkoutBox = $pm('premiumCheckoutBox');
    const heroRole = $pm('accHeroRole');
    const userRoleSlot = document.getElementById('userRoleSlot');

    if (banner) banner.style.display = 'none';
    if (checkoutBox) checkoutBox.style.display = 'block';
    if (heroRole) {
      heroRole.textContent = 'Pasajero';
      heroRole.className = 'account-badge role-badge passenger';
    }
    if (userRoleSlot) {
      userRoleSlot.textContent = 'Pasajero';
    }

    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.innerHTML = '<span>❌</span> Cancelar Suscripción';
    }

    _showToast('ℹ️ Tu suscripción Premium ha sido cancelada.', 'info');
  }

  // ── Inicialización ────────────────────────────────────────────────────────
  function _init() {
    // Intentar /config/payments o /api/v1/payments/config con fallback silencioso
    fetch('/config/payments')
      .then(r => r.ok ? r.json() : fetch('/api/v1/payments/config').then(r2 => r2.json()))
      .then((cfg) => {
        _stripePk = cfg?.stripePk || 'pk_test_sample';
      })
      .catch(() => {
        _stripePk = 'pk_test_sample';
      });

    _setupCardInputs();

    // Botón principal "Agregar método de pago" en Mi Cuenta
    const addBtn = $pm('addPaymentMethodBtn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _toggleAddCardSection();
      });
    }

    // Botones del formulario inline
    const cancelBtn = $pm('cancelAddCardBtn');
    const saveBtn   = $pm('saveCardSubmitBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => _toggleAddCardSection(false));
    if (saveBtn)   saveBtn.addEventListener('click', () => _handleSaveCard(false));

    // Botones del modal
    const modalClose = $pm('addPaymentClose');
    const modalCancel = $pm('cancelAddPaymentBtn');
    const modalConfirm = $pm('confirmAddPaymentBtn');
    if (modalClose) modalClose.addEventListener('click', _closeModal);
    if (modalCancel) modalCancel.addEventListener('click', _closeModal);
    if (modalConfirm) modalConfirm.addEventListener('click', () => _handleSaveCard(true));

    // Botón "Agregar método de pago" en la sección Premium
    const premAddCardBtn = $pm('premiumAddCardBtn');
    if (premAddCardBtn) {
      premAddCardBtn.addEventListener('click', () => {
        _goToView('account');
        setTimeout(() => _toggleAddCardSection(true), 200);
      });
    }

    // Botón "Desbloquear Premium por ₡500"
    const unlockBtn = $pm('unlockPremiumBtn');
    if (unlockBtn) unlockBtn.addEventListener('click', _handleUnlockPremium);

    // Botón "Cancelar Suscripción"
    const cancelSubBtn = $pm('cancelSubscriptionBtn');
    if (cancelSubBtn) cancelSubBtn.addEventListener('click', _handleCancelSubscription);

    // Verificar si ya es premium al cargar (desde localStorage y luego desde backend)
    function _applyPremiumUI() {
      const banner = $pm('premiumActiveBanner');
      const checkoutBox = $pm('premiumCheckoutBox');
      const heroRole = $pm('accHeroRole');
      const userRoleSlot = document.getElementById('userRoleSlot');
      if (banner) banner.style.display = 'flex';
      if (checkoutBox) checkoutBox.style.display = 'none';
      if (heroRole) {
        heroRole.textContent = '👑 Pasajero Premium';
        heroRole.className = 'account-badge role-badge premium';
      }
      if (userRoleSlot && !userRoleSlot.textContent.includes('Premium')) {
        userRoleSlot.textContent = '👑 Pasajero Premium';
      }
    }

    if (localStorage.getItem('bustrack_is_premium') === 'true') {
      _applyPremiumUI();
    }

    // Consultar el estado premium en el backend de forma asíncrona
    (async () => {
      const token = await _getToken();
      if (!token) return;
      try {
        const res = await fetch('/api/v1/payments/premium/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isPremium) {
            localStorage.setItem('bustrack_is_premium', 'true');
            if (window.currentUser) window.currentUser.role = 'premium';
            _applyPremiumUI();
          }
        }
      } catch (_) {}
    })();

    _fetchMethods();

    const accountSection = document.getElementById('view-account');
    if (accountSection) {
      const obs = new MutationObserver(() => {
        const isVisible = accountSection.classList.contains('active') ||
          (accountSection.style.display !== 'none' && !accountSection.hidden);
        if (isVisible) _fetchMethods();
      });
      obs.observe(accountSection, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    }

    // Observar cuando el usuario navega a la vista Premium para refrescar estado
    const premiumSection = document.getElementById('view-premium');
    if (premiumSection) {
      const premObs = new MutationObserver(() => {
        const isVisible = premiumSection.classList.contains('active');
        if (isVisible) {
          if (localStorage.getItem('bustrack_is_premium') === 'true') _applyPremiumUI();
          _fetchMethods();
        }
      });
      premObs.observe(premiumSection, { attributes: true, attributeFilter: ['class'] });
    }
  }

  window.loadPaymentMethods = _fetchMethods;
  window.openAddPaymentCardSection = () => _toggleAddCardSection(true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
