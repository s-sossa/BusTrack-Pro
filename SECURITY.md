# Security Policy — BusTrack Pro

> **Versión:** 1.0 · **Vigente desde:** 2026-01-01  
> **Responsable:** Equipo de Seguridad — BusTrack Pro Tecnología de Transporte S.A. (CJ 3-101-849201)

---

## Versiones con soporte activo

| Versión | Soporte de seguridad |
|---------|----------------------|
| 1.x     | ✅ Activo            |
| < 1.0   | ❌ Sin soporte       |

---

## Reportar una vulnerabilidad

Si descubres una vulnerabilidad de seguridad en BusTrack Pro, te pedimos que nos lo comuniques de forma **responsable y confidencial** antes de divulgarla públicamente.

### Canal preferido

**Correo electrónico:** security@bustrackpro.cr  
Por favor cifra tu reporte usando nuestra clave PGP disponible en  
`/.well-known/security.txt`

### Qué incluir en el reporte

- Descripción detallada de la vulnerabilidad
- Pasos para reproducirla (PoC mínimo)
- Impacto potencial estimado (confidencialidad / integridad / disponibilidad)
- Versión del software afectado
- Tu nombre o alias (opcional, para reconocimiento público si lo deseas)

---

## Tiempos de respuesta (SLA)

| Evento | Plazo máximo |
|--------|-------------|
| Acuse de recibo del reporte | **2 días hábiles** |
| Confirmación de reproducibilidad | **5 días hábiles** |
| Comunicación de plan de remediación | **15 días hábiles** |
| Publicación de parche (crítico/alto) | **30 días corridos** |
| Publicación de parche (medio/bajo) | **90 días corridos** |

Los plazos anteriores son objetivos internos. Vulnerabilidades de impacto crítico (CVSS ≥ 9.0) recibirán tratamiento prioritario inmediato.

---

## Política de divulgación coordinada

Seguimos el principio de **divulgación coordinada responsable (CVD)**:

1. El investigador reporta la vulnerabilidad de forma privada a BusTrack Pro.
2. BusTrack Pro confirma el reporte y trabaja en la remediación.
3. Tras publicar el parche (o vencer el plazo acordado), el investigador puede divulgar públicamente.
4. Acordamos un periodo de **90 días** de embargo desde la confirmación, salvo explotación activa.

---

## Ámbito del programa

### En ámbito (in scope)
- API REST (`/api/v1/*`)
- Gateway WebSocket (`/ws/telemetry`)
- Portal web (`bustrackpro.cr`, subdominios bajo `*.bustrackpro.cr`)
- Autenticación y autorización (JWT, Supabase Auth)
- Manejo de datos personales (Ley 8968)

### Fuera de ámbito (out of scope)
- Infraestructura de terceros (Supabase, Cloudflare, AWS)
- Ataques de denegación de servicio volumétrico
- Ingeniería social o phishing dirigido a empleados
- Escaneos automatizados no coordinados que afecten la disponibilidad
- Vulnerabilidades en versiones sin soporte activo

---

## Reconocimiento

Agradecemos públicamente a los investigadores que reporten vulnerabilidades válidas en nuestro **Hall of Thanks** (disponible próximamente en `bustrackpro.cr/security/thanks`), con su consentimiento.

---

## Base legal

Este proceso se enmarca en:
- **Ley 8968** — Protección de la Persona frente al Tratamiento de sus Datos Personales (Costa Rica)
- **Ley 9048** — Delitos Informáticos y Conexos (Costa Rica)
- Principios internacionales de ISO/IEC 29147 (Vulnerability Disclosure) e ISO/IEC 30111 (Vulnerability Handling)

---

*Para incidentes de privacidad de datos, contacta también: privacidad@bustrackpro.cr*

