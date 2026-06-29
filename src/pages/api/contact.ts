import type { APIRoute } from 'astro';
import { formConfig } from '../../form.config';

export const prerender = false;

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
function isPhone(v: string) {
  const digits = v.replace(/\D/g, '');
  return /^[+]?[\d\s()\-.]{6,}$/.test(v) && digits.length >= 7 && digits.length <= 15;
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
  if (phone && !isPhone(phone)) return json({ ok: false, error: 'Invalid phone' }, 400);
  if (message.length < 5 || message.length > 5000) return json({ ok: false, error: 'Invalid message' }, 400);

  // 4) Notification email to client
  const htmlBody = `
    <h2>New message from the website</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
    <p><strong>Message:</strong></p>
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
