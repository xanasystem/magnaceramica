const parseList = (v: string | undefined) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

export const formConfig = {
  to: parseList(import.meta.env.FORM_TO),
  cc: parseList(import.meta.env.FORM_CC),
  bcc: parseList(import.meta.env.FORM_BCC),
  fromName: import.meta.env.FORM_FROM_NAME ?? 'Magna Cerámica Web',
  fromEmail: import.meta.env.FORM_FROM_EMAIL ?? 'no-reply@forms.xanasystem.com',
  subject: import.meta.env.FORM_SUBJECT ?? 'New contact from Magna Cerámica Web',
  sendConfirmation: false,
  confirmationSubject: 'We have received your message',
};
