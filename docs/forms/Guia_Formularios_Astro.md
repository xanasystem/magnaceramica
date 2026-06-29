# Guía para hacer formularios en las landings de Astro

**Para quién es esto:** para quien construye las landings de Astro. No necesitas ser ingeniera. Sigue los pasos en orden y tendrás un formulario que envía un email al cliente, está protegido contra spam y ataques, y **no nos puede generar una factura sorpresa**. (La confirmación al usuario está desactivada por defecto: es un extra solo para proyectos personalizados — ver punto 1.)

**Truco:** puedes pegarle este documento entero a Claude Code dentro del proyecto y pedirle *"implementa el formulario siguiendo esta guía"*. Aun así, las partes de Vercel y los datos del cliente las tienes que poner tú a mano.

---

## 0. Cómo funciona (en 3 frases)

El formulario es HTML normal en una página estática. Cuando alguien lo envía, los datos van a un pequeño endpoint (`/api/contact`) que vive solo en ese sitio; ese endpoint comprueba que no es un bot y manda el email con Brevo. La página sigue siendo estática y rápida; lo único que corre en servidor es ese endpoint.

---

## 1. Reparto de tareas (quién hace qué)

**Por defecto, los emails salen de un dominio nuestro único** (`forms.xanasystem.com`), que ingeniería verifica **una sola vez** para todos los proyectos. Esto significa que, para un cliente nuevo normal, **no hay que tocar DNS**: el aviso del formulario le llega al cliente igualmente, y tú no esperas propagaciones.

**Lo que hace ingeniería (Aaron / Alejandro):**
- *(Una sola vez, ya hecho)* Verificar el dominio único `forms.xanasystem.com` en Brevo (DKIM en el DNS).
- *(Por cliente nuevo)* Darte: la **API Key de Brevo** (una específica para ese proyecto) y confirmarte el **remitente** (`fromEmail`), que por defecto es el del dominio compartido.

> Si no te han dado la API Key para un cliente nuevo, **párate y pídela**. El remitente por defecto ya lo sabes (el dominio compartido), pero no lo inventes: confírmalo con ingeniería.

**Caso especial — confirmación al usuario:** por defecto **NO** se envía confirmación a quien rellena el formulario (`sendConfirmation: false`); solo se avisa al cliente. Si un proyecto concreto sí quiere que el usuario reciba un "hemos recibido tu mensaje" **desde la marca del cliente**, eso es un proyecto personalizado: ingeniería verifica entonces el **dominio del cliente** y te da un `fromEmail` con ese dominio. No actives `sendConfirmation` por tu cuenta sin ese dominio configurado.

**Lo que haces tú, en cada proyecto:**
1. Copiar los 3 archivos del punto 2.
2. Rellenar la configuración del cliente (destinatarios, remitente, asunto).
3. Crear las claves de Turnstile (anti-bots) para el dominio.
4. Poner las variables de entorno en Vercel.
5. Añadir la regla de límite de peticiones en Vercel.
6. Probar.

El **checklist final** del punto 7 resume todo esto en casillas.

---

## 2. Los 3 archivos (copiar y pegar)

### Archivo 1 — El endpoint: `src/pages/api/contact.ts`

No hace falta tocar nada aquí salvo casos especiales. Es el cerebro: valida, comprueba que no es un bot y envía.

```ts
import type { APIRoute } from 'astro';
import { formConfig } from '../../form.config';

export const prerender = false; // <-- imprescindible: hace que SOLO esta ruta corra en servidor

const BREVO_API_KEY = import.meta.env.BREVO_API_KEY;
const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY;

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Petición inválida' }, 400); }

  // 1) Honeypot: campo oculto. Si viene relleno, es un bot. Fingimos éxito y no enviamos.
  if ((form.get('company') as string)?.trim()) return json({ ok: true });

  // 2) Turnstile: comprobamos que el visitante superó el reto anti-bot
  const token = form.get('cf-turnstile-response') as string;
  if (!token) return json({ ok: false, error: 'Verificación requerida' }, 400);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: clientAddress ?? '' }),
  }).then((r) => r.json());
  if (!verify.success) return json({ ok: false, error: 'Verificación fallida' }, 400);

  // 3) Validación de los campos
  const name = ((form.get('name') as string) ?? '').trim();
  const email = ((form.get('email') as string) ?? '').trim();
  const message = ((form.get('message') as string) ?? '').trim();
  if (name.length < 2 || name.length > 100) return json({ ok: false, error: 'Nombre no válido' }, 400);
  if (!isEmail(email)) return json({ ok: false, error: 'Email no válido' }, 400);
  if (message.length < 5 || message.length > 5000) return json({ ok: false, error: 'Mensaje no válido' }, 400);

  // 4) Email de aviso al cliente
  const htmlBody = `
    <h2>Nuevo mensaje desde la web</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;

  const sendEmail = (payload: object) =>
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

  const notify = await sendEmail({
    sender: { name: formConfig.fromName, email: formConfig.fromEmail },
    to: formConfig.to.map((e) => ({ email: e })),
    ...(formConfig.cc.length ? { cc: formConfig.cc.map((e) => ({ email: e })) } : {}),
    ...(formConfig.bcc.length ? { bcc: formConfig.bcc.map((e) => ({ email: e })) } : {}),
    replyTo: { email, name },
    subject: formConfig.subject,
    htmlContent: htmlBody,
  });

  if (!notify.ok) {
    console.error('Brevo error', notify.status, await notify.text());
    return json({ ok: false, error: 'No se pudo enviar' }, 502);
  }

  // 5) Confirmación opcional al usuario que rellenó el formulario
  if (formConfig.sendConfirmation) {
    await sendEmail({
      sender: { name: formConfig.fromName, email: formConfig.fromEmail },
      to: [{ email, name }],
      subject: formConfig.confirmationSubject,
      htmlContent: `<p>Hola ${escapeHtml(name)},</p><p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p><p>Un saludo.</p>`,
    }).catch((e) => console.error('Confirmación falló', e));
  }

  return json({ ok: true });
};
```

### Archivo 2 — La configuración del cliente: `src/form.config.ts`

**Los datos que cambian entre proyectos (destinatarios, asunto, remitente) NO se escriben aquí: van en variables de entorno** (`.env` en local, panel de Vercel en producción). Así puedes tener unos valores en local (tus emails de prueba) y otros en producción (el email real del cliente) sin tocar el código ni arriesgarte a subir datos al repositorio.

`form.config.ts` solo lee esas variables y aplica valores por defecto:

```ts
const parseList = (v: string | undefined) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

export const formConfig = {
  to: parseList(import.meta.env.FORM_TO),                       // destinatario(s); coma para varios
  cc: parseList(import.meta.env.FORM_CC),                       // copia (opcional)
  bcc: parseList(import.meta.env.FORM_BCC),                     // copia oculta (opcional)
  fromName: import.meta.env.FORM_FROM_NAME ?? 'Web de Cliente',
  fromEmail: import.meta.env.FORM_FROM_EMAIL ?? 'no-reply@forms.xanasystem.com',
  subject: import.meta.env.FORM_SUBJECT ?? 'Nuevo contacto desde la web',
  sendConfirmation: false,               // POR DEFECTO false. true SOLO en proyecto personalizado
                                         // con el dominio del cliente verificado (ver punto 1).
  confirmationSubject: 'Hemos recibido tu mensaje',
};
```

Y en el `.env` pones los valores reales (ver tabla del punto 3.3):

```env
FORM_TO=contacto@cliente.com
FORM_CC=
FORM_BCC=
FORM_SUBJECT=Nuevo contacto desde la web
FORM_FROM_NAME=Web de Cliente
FORM_FROM_EMAIL=no-reply@forms.xanasystem.com
```

> **Por defecto no toques `FORM_FROM_EMAIL` ni `sendConfirmation`:** el dominio compartido `forms.xanasystem.com` ya está verificado y la confirmación va desactivada. Solo cambian si ingeniería te confirma que es un proyecto con confirmación al usuario y dominio del cliente.
>
> ⚠️ **Entregabilidad:** el `FORM_FROM_EMAIL` debe ser de un dominio **verificado con DKIM en Brevo**. Que Brevo devuelva `200` al enviar solo significa que aceptó la llamada, **no** que el correo llegará: si el dominio no está verificado, cae en spam. Ante "no me llegan los correos", revisa primero la carpeta de spam y el **log transaccional de Brevo** (estado `delivered` / `blocked` / `soft bounce`).

### Archivo 3 — El formulario visible: `src/components/ContactForm.astro`

Mete los campos que quieras (manteniendo `name`, `email`, `message`, el honeypot y el widget de Turnstile). El diseño/estilos son libres.

```astro
---
const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
---
<form id="contact-form">
  <label>Nombre<input type="text" name="name" required /></label>
  <label>Email<input type="email" name="email" required /></label>
  <label>Mensaje<textarea name="message" required></textarea></label>

  <!-- Honeypot: invisible para personas, los bots lo rellenan. No lo quites. -->
  <input type="text" name="company" tabindex="-1" autocomplete="off"
         style="position:absolute;left:-9999px" aria-hidden="true" />

  <!-- Widget anti-bots de Cloudflare Turnstile -->
  <div class="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY}></div>

  <button type="submit">Enviar</button>
  <p id="form-status" role="status" aria-live="polite"></p>
</form>

<script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Enviando…';
    const res = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      // El firewall (o el endpoint) ha limitado por exceso de envíos
      status.textContent = 'Has enviado demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.';
    } else if (res.ok && data.ok) {
      form.reset();
      status.textContent = '¡Gracias! Hemos recibido tu mensaje.';
    } else {
      status.textContent = data.error ?? 'No se pudo enviar. Inténtalo de nuevo.';
    }
    window.turnstile?.reset();
  });
</script>
```

Luego, en la página donde quieras el formulario:
```astro
---
import ContactForm from '../components/ContactForm.astro';
---
<ContactForm />
```

### 2.4 Campos opcionales, obligatorios y validación

El ejemplo de arriba es el mínimo. En proyectos reales conviene añadir más cosas (como hicimos en Magna Cerámica):

- **Campo teléfono (`phone`):** opcional. Si quieres recogerlo, añade `<input type="tel" name="phone" />` en el componente; el endpoint ya lo lee y lo incluye en el email **solo si viene relleno**.
- **Campo de aceptación de términos (`terms`):** un checkbox obligatorio enlazado a la política de privacidad.
- **Marcar los obligatorios:** añade un asterisco visible (`*`) en el placeholder o label de cada campo obligatorio (`name`, `email`, `message`, `terms`). El opcional (`phone`) va sin asterisco.

**Validación en dos capas (ambas necesarias):**

1. **En el cliente (UX):** antes de enviar, el JS comprueba cada campo y, si falta o es inválido, lo **resalta en rojo con un mensaje debajo**, hace foco en el primero que falla y **no envía** hasta que esté todo correcto. El error de cada campo se borra solo en cuanto el usuario lo corrige. Reglas:
   - `name`: obligatorio, mínimo 2 caracteres.
   - `email`: obligatorio, formato válido (`algo@algo.dominio`).
   - `phone`: opcional, pero si se rellena debe ser un teléfono válido (7–15 dígitos; admite `+`, espacios, guiones y paréntesis).
   - `message`: obligatorio, mínimo 5 caracteres.
   - `terms`: debe estar marcado.

2. **En el servidor (fuente de verdad):** el endpoint repite TODA la validación (`name`, `email`, `phone` si viene, `message`). La validación de cliente se puede saltar; la del servidor no. **Nunca quites la del servidor.**

> El código completo y actualizado de este componente (con teléfono, términos, validación y resaltado de errores) está en el repositorio de Magna Cerámica (`src/components/Contact.astro`) y resumido en el documento *Configuración del formulario por proyecto*. Úsalo como plantilla en vez del ejemplo mínimo de arriba.

---

## 3. Configuración en Vercel (por proyecto)

### 3.1 Activar el adapter de Vercel
En la terminal del proyecto, una sola vez:
```bash
npx astro add vercel
```
Esto permite que el endpoint `/api/contact` funcione. **El resto del sitio sigue siendo estático**, no cambia nada del rendimiento.

### 3.2 Crear las claves anti-bots (Turnstile)
1. Entra en el panel de **Cloudflare → Turnstile**.
2. Crea un widget nuevo (o añade el dominio a uno existente). Pon el dominio del proyecto.
3. Te dará dos claves: **Site Key** (pública) y **Secret Key** (privada). Cópialas.

### 3.3 Poner las variables de entorno
En **Vercel → tu proyecto → Settings → Environment Variables**, añade estas (las mismas que tienes en tu `.env` local, pero con los valores de **producción**):

| Nombre | Visibilidad | Valor | De dónde sale |
|---|---|---|---|
| `BREVO_API_KEY` | secreta | la API key de Brevo (la de este cliente) | te la da ingeniería |
| `TURNSTILE_SECRET_KEY` | secreta | la Secret Key de Turnstile | del paso 3.2 |
| `PUBLIC_TURNSTILE_SITE_KEY` | pública | la Site Key de Turnstile | del paso 3.2 |
| `FORM_TO` | — | email(s) donde recibe el cliente; coma para varios | te lo da el cliente |
| `FORM_CC` | — | copia visible (opcional, vacío si no se usa) | — |
| `FORM_BCC` | — | copia oculta (opcional, vacío si no se usa) | — |
| `FORM_SUBJECT` | — | asunto del email de aviso | tú lo defines |
| `FORM_FROM_NAME` | — | nombre del remitente que verá el cliente | tú lo defines |
| `FORM_FROM_EMAIL` | — | remitente; por defecto `no-reply@forms.xanasystem.com` | ingeniería (solo cambia en proyectos con confirmación) |

> Las variables **sin** prefijo `PUBLIC_` no llegan nunca al navegador (se quedan en servidor). Nunca pongas la `BREVO_API_KEY` con prefijo `PUBLIC_`.
>
> En **local** usas el archivo `.env` (que está en `.gitignore`, no se sube al repo) con tus emails de prueba; en **producción** pones los valores reales en Vercel. El `.env.example` del repo documenta todas las variables.
>
> Después de añadirlas en Vercel, haz un **redeploy** para que tomen efecto.

### 3.4 Añadir el límite de peticiones (esto es lo que evita los sustos de factura)
En **Vercel → tu proyecto → Firewall → Configure → + New Rule**:
- **Condición (If):** `Request Path` *equals* `/api/contact`
- **Acción (Then):** `Rate Limit` → algoritmo **Fixed Window**
- **Request Limit:** `5` · **Time Window:** `10 minutes` · **Key:** `IP`
- Acción al superarlo: **Deny** (devuelve un 429)
- Activa **Persistent action**: cuando una IP supera el límite, queda bloqueada un rato (elige p. ej. **60 minutos**)
- **Review Changes → Publish**

Una persona real nunca envía 5 formularios en 10 minutos, así que esto solo afecta a bots. Vercel los **bloquea en la entrada, antes de ejecutar nada**, y ese tráfico bloqueado **no se factura**. (La ventana máxima en el plan Pro es de 10 minutos; no existe "por día" en el firewall, por eso usamos este enfoque de ráfaga.)

> Consejo: puedes arrancar la regla en modo **Log** unos días para ver cómo se comporta el tráfico antes de poner el **Deny**.

### 3.5 Lista blanca de la IP de la oficina (para vuestras pruebas)
Como vosotros sí enviaréis muchos formularios de prueba, hay que exceptuar la IP de la oficina para no autobloquearos. La oficina tiene **IP pública fija**; **pídele a ingeniería el valor exacto** (igual que con la API key).
- En la propia regla de rate-limit, usa la sección **Allow list** y añade la IP de la oficina, **o**
- Crea una regla aparte con acción **Bypass** que haga match con esa IP y colócala **por encima** de la de rate-limit.

---

## 4. Por qué esto es seguro a nivel de facturación

No hace falta que entiendas los detalles, solo que sepas que está cubierto por tres capas:

1. **Protección DDoS automática de Vercel:** los ataques grandes los para Vercel solo, gratis, y no nos cobra ese tráfico.
2. **Tu regla de límite de peticiones (paso 3.4):** corta los intentos de abuso en la puerta, sin coste.
3. **Tope de gasto del equipo (Spend Management):** **ya está activo** a nivel de cuenta, con presupuesto on-demand de 1 $ (Vercel no permite 0 $), avisos y **auto-pausa de proyectos**. En el peor caso imaginable, la web se pausa sola en lugar de generar una factura abierta.

Además, una persona que envía el formulario cuesta **una fracción de céntimo**, y Brevo gratis sirve 300 emails/día (de sobra para usuarios reales). No hay forma realista de que esto genere un gasto relevante.

---

## 5. Cómo saber si algo va mal

Revisa esto de vez en cuando, y sobre todo si te llega un aviso:

- **Aviso de Spend Management (email/SMS):** si llega, algo raro está pasando. Avisa a ingeniería.
- **Vercel → Firewall:** mira el panel de tráfico. Si ves muchos picos de *Denied* o *Challenged* en `/api/contact`, alguien está intentando abusar (y tu regla lo está parando, que es lo bueno).
- **Vercel → Usage:** si las *Invocations* o *Edge Requests* de ese proyecto se disparan sin motivo, es señal de ataque.
- **Vercel → Logs / Observability:** si un cliente dice *"el formulario no funciona"*, aquí ves el error concreto.
- **Brevo → panel:** si los envíos del día se acercan al límite de 300 sin que haya tanta gente real, es spam pasando. Revisa que Turnstile esté bien puesto.

---

## 6. Qué hacer si te están atacando ahora mismo

1. Ve a **Vercel → tu proyecto → Firewall → Bot Management** y activa **Attack Challenge Mode**. Desafía a todo el tráfico; es gratis y lo bloqueado no se factura. (Acuérdate de desactivarlo cuando pase.)
2. Comprueba que la regla de límite de peticiones del paso 3.4 está publicada.
3. Avisa a ingeniería.

---

## 7. Checklist final por proyecto

- [ ] Ingeniería me ha dado la **API Key de Brevo** de este proyecto (el remitente por defecto es el dominio compartido `forms.xanasystem.com`).
- [ ] He copiado los 3 archivos (`contact.ts`, `form.config.ts`, `ContactForm.astro`).
- [ ] He puesto los datos del cliente en **variables de entorno** (`FORM_TO`, `FORM_SUBJECT`, etc.), no en el código.
- [ ] He marcado los **campos obligatorios** con `*` y comprobado que la **validación** funciona (email/teléfono inválidos se resaltan; el formulario no envía si falta algo).
- [ ] He ejecutado `npx astro add vercel`.
- [ ] He creado las claves de **Turnstile** para el dominio.
- [ ] He puesto las **3 variables de entorno** en Vercel y he hecho redeploy.
- [ ] He añadido la **regla de límite de peticiones** en `/api/contact` (5 por 10 min + bloqueo persistente) y la he publicado.
- [ ] He añadido la **IP de la oficina a la lista blanca** (la facilita ingeniería).
- [ ] He **probado** el formulario: llega el aviso al cliente (y, solo si es proyecto con confirmación, también la confirmación al usuario).
- [ ] He confirmado que el **tope de gasto** del equipo está activo (preguntar a ingeniería si dudo).

---

*Cualquier duda que no esté aquí, preguntar a ingeniería antes de improvisar. Mejor parar y preguntar que dejar un formulario abierto a abusos.*
