/**
 * BusTrack Pro — Tipos JSDoc para el módulo de Métodos de Pago
 * Este archivo es de documentación únicamente. No contiene lógica de ejecución.
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string}  id         - UUID del método en la tabla public.payment_methods de Supabase
 * @property {string}  brand      - Marca de la tarjeta: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unionpay' | 'jcb' | 'diners' | 'unknown'
 * @property {string}  last4      - Últimos 4 dígitos de la tarjeta (sin el PAN completo)
 * @property {number}  expMonth   - Mes de vencimiento (1–12)
 * @property {number}  expYear    - Año de vencimiento (ej. 2027)
 * @property {boolean} isDefault  - Si es el método de pago predeterminado del usuario
 * @property {string}  createdAt  - Fecha de creación en formato ISO 8601 (UTC)
 */

/**
 * @typedef {Object} SetupIntentResponse
 * @property {string} status       - 'success'
 * @property {string} clientSecret - Client secret de Stripe para confirmar el SetupIntent en el cliente
 * @property {string} customerId   - ID del Stripe Customer asociado al usuario
 */

/**
 * @typedef {Object} SavePaymentMethodRequest
 * @property {string} setupIntentId - ID del SetupIntent confirmado por Stripe (prefijo 'seti_')
 */

/**
 * @typedef {Object} SavePaymentMethodResponse
 * @property {string}        status        - 'success'
 * @property {PaymentMethod} paymentMethod - Método de pago guardado (sin datos sensibles)
 */

/**
 * @typedef {Object} ListPaymentMethodsResponse
 * @property {string}          status         - 'success'
 * @property {PaymentMethod[]} paymentMethods - Lista de métodos de pago del usuario
 */

/**
 * @typedef {Object} ApiSuccessResponse
 * @property {string} status  - 'success'
 * @property {string} message - Mensaje descriptivo para el usuario
 */

/**
 * @typedef {Object} ApiError
 * @property {string} type   - 'about:blank'
 * @property {string} title  - Nombre del error HTTP (ej. 'Bad Request')
 * @property {number} status - Código HTTP (400, 401, 404, 409, 500)
 * @property {string} detail - Mensaje descriptivo en español
 */

/**
 * @typedef {Object} StripeCustomer
 * @property {string} user_id            - UUID del usuario en Supabase Auth
 * @property {string} stripe_customer_id - ID del Customer en Stripe (prefijo 'cus_')
 * @property {string} created_at         - Fecha de creación en formato ISO 8601
 */

export {}; // ESM nominal export para que los IDEs reconozcan el archivo
