/**
 * BusTrack Pro — Textos y mensajes del módulo de Métodos de Pago (español)
 * Centraliza todos los strings visibles al usuario para facilitar revisiones.
 */
(function () {
  window.PM_MESSAGES = {
    // Estados de la lista
    loading:            'Cargando métodos de pago...',
    empty:              'Aún no tienes tarjetas guardadas.',
    error:              'No se pudieron cargar los métodos de pago.',

    // Acciones
    addCard:            '+ Agregar Tarjeta',
    saveCard:           'Guardar Tarjeta',
    cancel:             'Cancelar',
    setDefault:         'Usar como predeterminado',
    deleteCard:         'Eliminar tarjeta',

    // Modal de agregar
    modalTitle:         'Agregar Tarjeta',
    modalSubtitle:      'Tus datos viajan cifrados directamente a Stripe',
    modalSecurity:      '🔒 Procesado de forma segura por Stripe. BusTrack Pro nunca almacena tus datos de tarjeta.',

    // Confirmación de eliminación
    deleteConfirm:      (last4) => `¿Eliminar la tarjeta terminada en ${last4}? Esta acción no se puede deshacer.`,

    // Toasts de éxito
    successAdd:         '✅ Tarjeta agregada exitosamente',
    successDelete:      '🗑️ Tarjeta eliminada',
    successDefault:     '✅ Método predeterminado actualizado',

    // Errores de API
    errNoSession:       'Debes iniciar sesión para usar esta función.',
    errSessionExpired:  'Tu sesión expiró. Inicia sesión de nuevo.',
    errNotConfigured:   'El módulo de pagos no está configurado. Contacta al administrador.',
    errStripeLoad:      'No se pudo cargar el módulo de pago. Recarga la página.',
    errNetworkAdd:      'Error de red al guardar la tarjeta. Intenta de nuevo.',
    errNetworkDelete:   'Error de red al eliminar. Intenta de nuevo.',
    errNetworkDefault:  'Error de red al actualizar. Intenta de nuevo.',
    errSetupIntent:     'No se pudo iniciar la sesión de pago.',
    errSaveFailed:      'No se pudo guardar la tarjeta.',
    errGeneric:         'Ocurrió un error. Intenta de nuevo.',

    // Traducción de errores comunes de Stripe
    stripeErrors: {
      'card_declined':        'Tu tarjeta fue rechazada. Verifica los datos o usa otra tarjeta.',
      'expired_card':         'Tu tarjeta está vencida.',
      'incorrect_cvc':        'El código de seguridad es incorrecto.',
      'insufficient_funds':   'Fondos insuficientes en la tarjeta.',
      'processing_error':     'Error al procesar la tarjeta. Intenta de nuevo.',
      'invalid_card_number':  'El número de tarjeta no es válido.',
    },

    // Accesibilidad
    a11yDefaultBadge:   'Método predeterminado',
    a11ySetDefault:     (last4) => `Marcar tarjeta terminada en ${last4} como predeterminada`,
    a11yDelete:         (last4) => `Eliminar tarjeta terminada en ${last4}`,
    a11yCardList:       'Métodos de pago guardados',
  };
})();
