/**
 * BusTrack Pro — Íconos SVG de marcas de tarjeta
 * Uso: window.PM_BRAND_ICONS['visa'] → string SVG
 * Fuente: colores y logotipos de las marcas, sin dependencias externas.
 */
(function () {
  window.PM_BRAND_ICONS = {
    visa: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visa">
      <rect width="36" height="24" rx="4" fill="#1a1f71"/>
      <text x="4" y="17" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="-0.5">VISA</text>
    </svg>`,

    mastercard: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mastercard">
      <rect width="36" height="24" rx="4" fill="#252525"/>
      <circle cx="14" cy="12" r="7" fill="#EB001B"/>
      <circle cx="22" cy="12" r="7" fill="#F79E1B"/>
      <path d="M18 7.1a7 7 0 010 9.8A7 7 0 0118 7.1z" fill="#FF5F00"/>
    </svg>`,

    amex: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="American Express">
      <rect width="36" height="24" rx="4" fill="#2E77BC"/>
      <text x="4" y="17" font-family="Arial,sans-serif" font-size="8" font-weight="bold" fill="#ffffff">AMEX</text>
    </svg>`,

    discover: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Discover">
      <rect width="36" height="24" rx="4" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
      <circle cx="24" cy="12" r="8" fill="#f97316"/>
      <text x="2" y="11" font-family="Arial,sans-serif" font-size="5" font-weight="bold" fill="#6b7280">DISCOVER</text>
    </svg>`,

    unionpay: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="UnionPay">
      <rect width="36" height="24" rx="4" fill="#c0392b"/>
      <text x="2" y="17" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="#ffffff">UnionPay</text>
    </svg>`,

    jcb: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JCB">
      <rect width="36" height="24" rx="4" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
      <text x="4" y="17" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#003087">JCB</text>
    </svg>`,

    diners: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diners Club">
      <rect width="36" height="24" rx="4" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
      <text x="2" y="11" font-family="Arial,sans-serif" font-size="5" font-weight="bold" fill="#6b7280">DINERS</text>
      <circle cx="18" cy="14" r="5" stroke="#6b7280" stroke-width="1" fill="none"/>
    </svg>`,

    unknown: `<svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tarjeta de crédito">
      <rect width="36" height="24" rx="4" fill="#374151"/>
      <rect x="4" y="8" width="10" height="8" rx="1" fill="#9ca3af"/>
      <text x="18" y="17" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">CARD</text>
    </svg>`,
  };
})();
