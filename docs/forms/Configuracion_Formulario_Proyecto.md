# Configuración del formulario por proyecto (referencia rápida)

**Versión:** 1.0 · **Fecha:** 2026-06-29
**Qué es esto:** la guía práctica y actualizada para montar el formulario de contacto en un proyecto Astro, tal y como quedó implementado en **Magna Cerámica**. Es la versión "real" (config por variables de entorno, campo teléfono, aceptación de términos y validación con resaltado de errores), más completa que el ejemplo mínimo de la *Guía*. Documentos complementarios: *Guía para hacer formularios en las landings de Astro* (el porqué y el reparto de tareas) y *Documentación técnica* (funcionamiento interno).

> **Plantilla a copiar:** los archivos reales y funcionando están en este repo. Cópialos de aquí en vez de teclear desde cero:
> - `src/pages/api/contact.ts` — endpoint (no se toca salvo casos especiales)
> - `src/form.config.ts` — lee la config de variables de entorno
> - `src/components/Contact.astro` — formulario con diseño, campos, validación y envío

---

## 1. Qué cambia respecto al ejemplo mínimo de la Guía

| Aspecto | Ejemplo mínimo (Guía) | Implementación real (este doc) |
|---|---|---|
| Config (destinatarios, asunto, remitente) | Hardcodeada en `form.config.ts` | En **variables de entorno**; `form.config.ts` solo las lee |
| Campos | `name`, `email`, `message` | + `phone` (opcional) + `terms` (checkbox obligatorio) |
| Obligatorios | Solo atributo `required` | Marcados con `*` + validación visible |
| Validación | Solo servidor | **Cliente (UX) + servidor (fuente de verdad)**, mismas reglas |
| Errores | Un mensaje global | Mensaje **por campo**, resaltado en rojo, foco al primero que falla |

---

## 2. Variables de entorno

En **local** van en `.env` (que está en `.gitignore`, no se sube). En **producción**, en *Vercel → Settings → Environment Variables*. El repo trae un `.env.example` con todas documentadas.

```env
# Brevo (envío de email) — la API key la da ingeniería
BREVO_API_KEY=

# Cloudflare Turnstile (anti-bots) — del panel de Cloudflare
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=

# Destinatarios y remitente del formulario
FORM_TO=info@cliente.com          # coma para varios: a@x.com,b@x.com
FORM_CC=                          # opcional
FORM_BCC=                         # opcional
FORM_SUBJECT=Nuevo contacto desde la web
FORM_FROM_NAME=Web de Cliente
FORM_FROM_EMAIL=no-reply@forms.xanasystem.com   # dominio compartido verificado (por defecto)
```

Reglas:
- Solo `PUBLIC_TURNSTILE_SITE_KEY` llega al navegador (prefijo `PUBLIC_`). El resto se queda en servidor. **Nunca** pongas `BREVO_API_KEY` con prefijo `PUBLIC_`.
- En local puedes usar tus emails de prueba en `FORM_TO`/`FORM_CC`; en producción pon los del cliente.
- Tras cambiar variables, **reinicia el dev server** (local) o haz **redeploy** (Vercel).

---

## 3. Campos del formulario

| Campo | Obligatorio | Regla de validación |
|---|---|---|
| `name` | sí | 2–100 caracteres |
| `email` | sí | formato `algo@algo.dominio` |
| `phone` | **no** | si se rellena: 7–15 dígitos; admite `+`, espacios, `-`, `()` |
| `message` | sí | 5–5000 caracteres |
| `terms` | sí | checkbox marcado (consentimiento) |
| `company` | — | **honeypot** oculto; debe ir vacío. No quitar |
| `cf-turnstile-response` | sí | lo inyecta el widget de Turnstile |

- Los obligatorios se marcan con un asterisco visible (`*`) y llevan `required` + `aria-required`.
- `phone` y `terms` no se envían a Brevo como cabeceras: `phone` va al cuerpo del email solo si viene relleno; `terms` es solo consentimiento de cliente.

---

## 4. Validación (dos capas)

**Cliente (UX), en `Contact.astro`:** al pulsar enviar, valida todos los campos con las reglas de la tabla. Si algo falla:
- resalta el campo en rojo y escribe el mensaje en un `<small>` bajo él,
- hace **foco en el primero** que falla,
- **no envía** hasta que esté todo correcto,
- borra el error de cada campo en cuanto el usuario lo corrige (`input`/`change`).

**Servidor (fuente de verdad), en `contact.ts`:** repite TODAS las reglas (incluida la de teléfono si viene). La validación de cliente se puede saltar manipulando el DOM; la del servidor no. **No quites la validación de servidor.**

Para añadir un campo nuevo: añádelo en los tres sitios — el `<input>` en el componente (con su regla en el objeto de validación de cliente), la lectura + validación + `escapeHtml` en el endpoint, y el `htmlContent` del email.

---

## 5. Checklist de alta por proyecto

- [ ] Copiados los 3 archivos (`contact.ts`, `form.config.ts`, `Contact.astro`).
- [ ] `npx astro add vercel` ejecutado (activa el endpoint; el resto sigue estático).
- [ ] Claves de **Turnstile** creadas en Cloudflare para el dominio.
- [ ] **Variables de entorno** puestas en local (`.env`) y en Vercel (con valores de producción) + redeploy.
- [ ] Campos obligatorios marcados con `*`; validación probada (email/teléfono inválidos se resaltan; no envía si falta algo).
- [ ] Regla de **rate limit** en Vercel (`/api/contact`, 5/10 min, Fixed Window, Deny + persistent action) publicada.
- [ ] **IP de oficina** en la lista blanca (la facilita ingeniería).
- [ ] **Envío de prueba real**: llega el aviso y **no** cae en spam (ver §6).

---

## 6. "No me llega el correo" (lo más habitual)

Que el endpoint responda `200`/`ok` significa que **Brevo aceptó la llamada** (devuelve un `messageId`), **no** que el correo haya llegado. Si no aparece:

1. Revisa la carpeta de **spam** del destinatario.
2. Mira el **log transaccional de Brevo** (Transactional → Logs): busca el `messageId` y su estado (`delivered`, `blocked`, `soft bounce`).
3. **Entregabilidad / DKIM:** el `FORM_FROM_EMAIL` debe ser de un dominio verificado con DKIM en Brevo. Por defecto es `forms.xanasystem.com` (ya verificado). Si usas otro dominio sin verificar, el correo cae en spam — es la causa nº1.
4. **`401 unrecognised IP`:** Brevo tiene activada la autorización de IP (Security & Privacy → Authorized IPs). Autoriza la IP o desactiva esa restricción.

---

## 7. Control de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-06-29 | Versión inicial, basada en la implementación de Magna Cerámica: config por entorno, campo teléfono, términos, validación cliente+servidor con resaltado de errores. |
