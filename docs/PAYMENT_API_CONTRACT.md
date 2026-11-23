# BusTrack Pro — Payment & Premium API Contract

Base URL: `/api/v1/payments`

Todos los endpoints (excepto `/webhook`) requieren autenticación mediante Header `Authorization: Bearer <JWT>`.

---

## 1. Endpoints de Métodos de Pago

### `POST /api/v1/payments/setup-intent`
Crea un `SetupIntent` de Stripe para asociar una nueva tarjeta de forma segura.
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "clientSecret": "seti_123_secret_abc",
  "customerId": "cus_abc123"
}
```

### `POST /api/v1/payments/methods`
Guarda un método de pago confirmado tras la validación del SetupIntent.
- **Body:** `{ "setupIntentId": "seti_123..." }`
- **Respuesta (201 Created):**
```json
{
  "status": "success",
  "paymentMethod": {
    "id": "uuid-...",
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2028,
    "isDefault": true,
    "createdAt": "2026-11-23T16:30:00Z"
  }
}
```

### `GET /api/v1/payments/methods`
Lista los métodos de pago guardados del usuario.
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "paymentMethods": [...]
}
```

### `PUT /api/v1/payments/methods/:id/default`
Establece un método como predeterminado (protegido contra IDOR).

### `DELETE /api/v1/payments/methods/:id`
Elimina un método de pago y lo desvincula en Stripe.

---

## 2. Endpoints de Membresía Premium (₡500 CRC)

### `POST /api/v1/payments/premium/create-intent`
Crea un PaymentIntent por ₡500 CRC (`50000` centavos/unidades mínimas) para adquirir la membresía Premium.
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "clientSecret": "pi_123_secret_xyz",
  "paymentIntentId": "pi_123",
  "amount": 500,
  "currency": "CRC"
}
```

### `POST /api/v1/payments/premium/charge-saved`
Realiza el cobro directo de la membresía Premium usando una tarjeta guardada (`off_session: true`).
- **Body:** `{ "paymentMethodId": "uuid-..." }`
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "message": "¡Membresía Premium activada con éxito!"
}
```

### `POST /api/v1/payments/premium/confirm`
Confirma un pago completado en el cliente y activa la membresía.
- **Body:** `{ "paymentIntentId": "pi_123..." }`
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "isPremium": true
}
```

### `GET /api/v1/payments/premium/status`
Consulta si el usuario autenticado tiene activa la membresía Premium.
- **Respuesta (200 OK):**
```json
{
  "status": "success",
  "isPremium": true,
  "tier": "premium",
  "details": {
    "status": "active",
    "activated_at": "2026-11-23T16:30:00Z",
    "amount": 500,
    "currency": "crc"
  }
}
```
