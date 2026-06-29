import type { APIRoute } from 'astro';
import { formConfig } from '../../form.config';

export const prerender = false;

const BREVO_API_KEY = import.meta.env.BREVO_API_KEY;
const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY;
// Absolute, publicly reachable URL for the email logo (emails can't use local
// or build-processed assets). Defaults to the logo hosted on the client's own
// site; override per environment via FORM_LOGO_URL.
const LOGO_URL = import.meta.env.FORM_LOGO_URL ?? 'https://www.magnaceramica.es/wp-content/uploads/2022/05/logo-magna-blanco-uai-258x88.png';

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isPhone(v: string) {
  const digits = v.replace(/\D/g, '');
  return /^[+]?[\d\s()\-.]{6,}$/.test(v) && digits.length >= 7 && digits.length <= 15;
}

// Branded HTML for the internal lead-notification email.
// Email clients need table layout + inline styles + web-safe fonts (Georgia
// echoes the brand serif; Arial for body). Brand colors mirror global.css.
function renderNotificationEmail(data: { name: string; email: string; phone: string; message: string }) {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const phone = data.phone ? escapeHtml(data.phone) : '';
  const message = escapeHtml(data.message).replace(/\n/g, '<br>');

  const row = (label: string, value: string) => `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eaeaea;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b6358;text-transform:uppercase;letter-spacing:0.05em;width:110px;vertical-align:top;">${label}</td>
                <td style="padding:12px 0;border-bottom:1px solid #eaeaea;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1c1a18;vertical-align:top;">${value}</td>
              </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New website enquiry</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#905335;padding:36px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="Magna Cer&aacute;mica" width="200" height="68" style="display:block;margin:0 auto;width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c1a18;margin:0 0 24px;">You have received a new enquiry through the website contact form:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row('Name', name)}
                ${row('Email', `<a href="mailto:${email}" style="color:#905335;text-decoration:none;">${email}</a>`)}
                ${phone ? row('Phone', phone) : ''}
              </table>
              <div style="margin-top:24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b6358;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Message</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c1a18;background:#f2f2f2;border-radius:6px;padding:16px;">${message}</div>
              </div>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b6358;margin:24px 0 0;">Reply directly to this email to respond to ${name}.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#eaeaea;padding:20px 32px;text-align:center;border-top:1px solid #dcdcdc;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b6358;">Magna Cer&aacute;mica &middot; ceramic tile division of Grupo Merhi<br />Sent automatically from the website contact form.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Invalid request' }, 400); }

  // 1) Honeypot
  if ((form.get('company') as string)?.trim()) return json({ ok: true });

  // 2) Turnstile
  const token = form.get('cf-turnstile-response') as string;
  if (!token) return json({ ok: false, error: 'Verification required' }, 400);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: clientAddress ?? '' }),
  }).then((r) => r.json());
  if (!verify.success) return json({ ok: false, error: 'Verification failed' }, 400);

  // 3) Validation
  const name = ((form.get('name') as string) ?? '').trim();
  const email = ((form.get('email') as string) ?? '').trim();
  const phone = ((form.get('phone') as string) ?? '').trim();
  const message = ((form.get('message') as string) ?? '').trim();
  if (name.length < 2 || name.length > 100) return json({ ok: false, error: 'Invalid name' }, 400);
  if (!isEmail(email)) return json({ ok: false, error: 'Invalid email' }, 400);
  if (!isPhone(phone)) return json({ ok: false, error: 'Invalid phone' }, 400);
  if (message.length < 5 || message.length > 5000) return json({ ok: false, error: 'Invalid message' }, 400);

  // 4) Notification email to client
  const htmlBody = renderNotificationEmail({ name, email, phone, message });

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
    return json({ ok: false, error: 'Could not send message' }, 502);
  }
  // Log the Brevo messageId so a "no me llega" report can be traced in Brevo's logs.
  const { messageId } = await notify.json().catch(() => ({ messageId: undefined }));
  console.log('[contact] sent', notify.status, messageId);

  // 5) Optional confirmation to user (disabled by default)
  if (formConfig.sendConfirmation) {
    await sendEmail({
      sender: { name: formConfig.fromName, email: formConfig.fromEmail },
      to: [{ email, name }],
      subject: formConfig.confirmationSubject,
      htmlContent: `<p>Hi ${escapeHtml(name)},</p><p>We have received your message and will get back to you as soon as possible.</p><p>Kind regards.</p>`,
    }).catch((e) => console.error('Confirmation failed', e));
  }

  return json({ ok: true });
};
