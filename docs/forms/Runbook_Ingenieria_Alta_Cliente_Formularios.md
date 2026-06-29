# Runbook de ingeniería — Alta de cliente en el sistema de formularios

**Versión:** 1.0 · **Fecha:** 2026-06-29 · **Documento interno de ingeniería** (Aaron / Alejandro)
**Complementa:** *Guía para hacer formularios en las landings de Astro* (pasos de implementación de Belén) y *Documentación técnica — Sistema de formularios en Astro* (referencia del sistema).

---

## 0. Propósito y cuándo se usa

Este runbook describe las tareas que hace **ingeniería** para que Belén pueda implementar el formulario en el proyecto Astro: crear la API key del proyecto en Brevo y entregarle lo que necesita.

**Modelo por defecto (la mayoría de los casos):** los formularios envían desde un **dominio único compartido** (`forms.xanasystem.com`), verificado en Brevo **una sola vez** (§2.2). Por eso, dar de alta un cliente nuevo normal **no requiere tocar DNS**: basta crear la API key del proyecto y entregarla (§2.1, §2.3). El alta baja a unos ~5 minutos.

**Variante (proyecto con confirmación al usuario):** si un proyecto quiere enviar confirmación al usuario que rellena el formulario **desde la marca del cliente**, entonces —y solo entonces— se autentica el **dominio del cliente** (DKIM/DMARC) como en §2.2, y se entrega un `fromEmail` bajo ese dominio con `sendConfirmation: true`.

Regla práctica: para un cliente normal, si la API key no está creada, se crea; no hay DNS que esperar. Para un proyecto con confirmación, el dominio del cliente debe estar verificado **antes** de activar la confirmación, o los correos al usuario caen en spam.

---

## 1. Recursos y dónde viven los secretos

- **Cuenta de Brevo del sistema:** la cuenta compartida de proyectos de marketing. Credenciales en el **gestor de secretos del equipo**.
- **Dominio de envío compartido:** `forms.xanasystem.com`, subdominio dedicado para aislar la reputación del correo corporativo. Verificado una sola vez (§2.2); es el remitente por defecto de todos los proyectos.
- **IP pública fija de la oficina:** en las **notas internas / gestor**. Es la misma para todos los proyectos (constante).
- **Cuenta de Cloudflare** (para Turnstile) y **equipo de Vercel Pro:** gestionados por ingeniería.

> Este documento describe **procedimientos**, no contiene **valores**. Las claves, la IP y los registros DNS concretos se entregan o consultan en el momento, no se escriben aquí.

---

## 2. Procedimiento de alta (por cliente nuevo)

Dos caminos según el proyecto:
- **(A) Cliente normal (por defecto):** solo **2.1** (crear API key) + **2.3** (entregar). Sin DNS. El remitente es el dominio compartido.
- **(B) Proyecto con confirmación al usuario:** además, **2.2** aplicado al **dominio del cliente**, y se entrega su `fromEmail` con `sendConfirmation: true`.

### 2.1 Crear la API key del proyecto en Brevo
1. Entrar en la cuenta de Brevo del sistema.
2. Ir a **SMTP & API → API Keys → Generate a new API key**.
3. Nombrarla de forma identificable, p. ej. `form-{cliente}`, para distinguirla en la lista (recuerda: **una key por proyecto**).
4. Copiar el valor **en el momento** (Brevo solo lo muestra una vez) y guardarlo en el gestor de secretos.
5. Esta key es la que se entrega a Belén para la variable `BREVO_API_KEY` del proyecto.

> Modelo: una sola cuenta, una key por proyecto. Esto permite revocar o rotar la de un cliente sin tocar las demás y atribuir envíos por proyecto (no aísla el límite ni la reputación, que son de la cuenta — ver §5).

### 2.2 Autenticar el dominio (DKIM/DMARC)

Este procedimiento se aplica **una sola vez al dominio compartido** `forms.xanasystem.com` (setup inicial, normalmente ya hecho). Para un cliente normal **no se repite**. Solo se repite sobre el **dominio del cliente** en la variante (B), proyecto con confirmación al usuario.

**Por qué:** Brevo envía desde IP compartida, así que la alineación **SPF siempre falla**; **DMARC solo pasa por DKIM**. Sin DKIM verificado, los correos del formulario caen en spam. Es la causa nº 1 de "el formulario no llega".

1. En Brevo: menú de la cuenta (nombre arriba a la derecha) → **Senders, Domains, and Dedicated IPs → Domains → Add a domain**. Escribir el dominio (`forms.xanasystem.com` en el setup único; el dominio del cliente en la variante (B)) y guardar.
2. Brevo genera los registros a publicar: **Brevo code** (TXT de verificación), **DKIM** (CNAME, clave 2048-bit por defecto) y **DMARC** (TXT, `p=none` de placeholder).
3. Publicar esos registros por una de las dos vías:
   - **Automática:** Brevo entra en el proveedor DNS y añade los registros (requiere credenciales del DNS).
   - **Manual (lo habitual):** copiar los registros y añadirlos en el DNS donde se gestione el dominio (Cloudflare, Route 53, registrador, etc.). Para el dominio compartido es nuestro propio DNS.
4. **SPF:** no es necesario para Brevo y no alineará; **no** añadir el `include` de Brevo esperando alineación. Si el dominio ya tiene SPF para otros servicios, dejarlo como está.
5. **DMARC:** el dominio debe tener **un único** registro DMARC con tag `rua` (el de Brevo es `rua=mailto:rua@dmarc.brevo.com`), `p=none` como mínimo. Si ya existe un DMARC, **no duplicar**: añadir el `rua` al registro existente.
6. Volver a Brevo y pulsar **Authenticate this email domain / Check configuration**. La propagación puede tardar hasta 24-48 h; repetir la verificación hasta ver los **checks verdes**.
7. Crear el **sender** (remitente): para el dominio compartido, p. ej. `no-reply@forms.xanasystem.com`; en la variante (B), bajo el dominio del cliente (p. ej. `no-reply@dominiocliente.com`).

### 2.3 Entregar a Belén
Por cada proyecto, ingeniería le facilita:
- La **API key** del proyecto (2.1).
- El **`fromEmail`**: por defecto el del dominio compartido (`no-reply@forms.xanasystem.com`). En la variante (B), el del dominio del cliente ya verificado, indicando que active `sendConfirmation: true`.
- La **IP pública de la oficina** para la lista blanca del firewall (constante, de las notas internas).

Belén las introduce en las variables de entorno y en `form.config.ts` siguiendo la guía. Ningún valor de estos se deja escrito en la guía ni en la doc técnica.

---

## 3. Verificación post-implementación

Tras el deploy de Belén:
- Enviar un **envío de prueba real**; confirmar que el aviso llega al cliente (y, solo en proyectos con confirmación, que también llega la confirmación al usuario).
- Confirmar que **no cae en spam** (DKIM funcionando). Ante la duda, revisar cabeceras o usar un test de entregabilidad.
- Revisar el **log de transaccional en Brevo** (el envío debe aparecer registrado).
- Probar la **whitelist**: desde la IP de oficina, varios envíos seguidos no deben bloquearse; desde fuera, superar el umbral (5 / 10 min) debe devolver **429**.

---

## 4. Rotación / revocación de una key

Ventaja del modelo "una key por proyecto": se opera sobre un cliente sin afectar a los demás.
1. Crear una **key nueva** en Brevo (si se rota).
2. Actualizar `BREVO_API_KEY` de ese proyecto en Vercel y hacer **redeploy**.
3. **Borrar la key antigua** en Brevo.

Hacerlo de inmediato si una key se filtra (p. ej. aparece en un repo). El resto de proyectos no se ven afectados.

---

## 5. Monitorización a nivel de cuenta (la cuenta es compartida)

Como la cuenta de Brevo es **una sola**, hay límites y riesgos comunes a todos los clientes:
- **Volumen diario:** el plan gratuito da **300 emails/día compartidos**. Acercarse sin tráfico real = abuso; por crecimiento legítimo = toca plan de pago.
- **Rebotes y quejas:** una **suspensión de cuenta** por parte de Brevo afectaría a **todos** los clientes. Mantener el DKIM correcto y no enviar a direcciones inválidas.
- **Vercel:** revisar el firewall y el uso (ver *Documentación técnica*, §12), y confirmar que Spend Management sigue activo con auto-pausa.

---

## 6. Baja de un cliente

1. **Revocar/borrar** su API key en Brevo.
2. **No tocar** el dominio compartido `forms.xanasystem.com` (lo usan los demás proyectos). Solo en la variante (B): quitar el **sender** del cliente y, si ya no se usa para nada más, su **dominio** de Brevo (cuidado si comparte con otros servicios del cliente).
3. Anotar que ese proyecto queda **sin capacidad de envío**.

---

## 7. Checklist de alta (por cliente)

**Cliente normal (por defecto):**
- [ ] API key creada en Brevo con nombre identificable (`form-{cliente}`) y guardada en el gestor.
- [ ] Entregado a Belén: **API key**, **`fromEmail`** del dominio compartido e **IP de oficina**.
- [ ] Verificación post-deploy: la prueba real llega y **no** cae en spam.
- [ ] Whitelist probada: oficina no se bloquea; desde fuera, **429** al exceder.

**Solo si es proyecto con confirmación al usuario (variante B):**
- [ ] Dominio del cliente añadido y **DKIM/DMARC verificados** (checks verdes en Brevo).
- [ ] Sender `fromEmail` creado bajo el dominio del cliente; indicado a Belén que active `sendConfirmation: true`.
- [ ] Prueba real: la confirmación llega al usuario y **no** cae en spam.

---

## 8. Control de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-06-29 | Versión inicial. |
| 1.1 | 2026-06-29 | Modelo de dominio único compartido (`forms.xanasystem.com`) por defecto: alta de cliente normal = solo API key + entrega, sin DNS. La autenticación de dominio (§2.2) pasa a setup único; el dominio del cliente solo se verifica en la variante de proyecto con confirmación al usuario. Actualizados secciones 0, 1, 2, 3, 6 y 7. |
