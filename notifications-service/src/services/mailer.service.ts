import nodemailer, { type SendMailOptions } from 'nodemailer';
import env from '#config/env';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: { user: env.smtp.user, pass: env.smtp.password },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
});

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const shell = (title: string, content: string): string => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f6f1e8;font-family:Arial,sans-serif;color:#34251f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border:1px solid #eadbc3;border-radius:14px;overflow:hidden">
<tr><td style="height:8px;background:#971b1f"></td></tr><tr><td style="padding:30px">
<div style="color:#c48a19;font-size:13px;font-weight:bold;letter-spacing:1.5px">ACADEMIA CABSA</div>
<h1 style="margin:10px 0 20px;color:#971b1f;font-size:25px">${escapeHtml(title)}</h1>${content}
<p style="margin:28px 0 0;color:#756861;font-size:12px">Este es un mensaje transaccional de Academia CABSA. Si no realizaste esta acción, ignora el correo o contacta a soporte.</p>
</td></tr></table></td></tr></table></body></html>`;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: SendMailOptions['attachments'];
}

export const sendMail = async (message: MailMessage) => transporter.sendMail({
  from: { name: env.smtp.fromName, address: env.smtp.fromAddress },
  ...message,
});

export const verifySmtp = async (): Promise<void> => {
  await transporter.verify();
};

export const accountVerificationMail = (
  to: string, displayName: string, code: string, verificationUrl: string,
): MailMessage => ({
  to,
  subject: 'Activa tu cuenta de Academia CABSA',
  text: `Hola ${displayName}. Activa tu cuenta desde este enlace: ${verificationUrl}\n\nComo alternativa, usa el código ${code}. Vence en 15 minutos.`,
  html: shell('Activa tu cuenta', `<p>Hola <strong>${escapeHtml(displayName)}</strong>, confirma que este correo te pertenece.</p>
<p style="margin:24px 0;text-align:center"><a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:14px 22px;background:#971b1f;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Confirmar y activar mi cuenta</a></p>
<p>Si el botón no funciona, también puedes usar este código:</p>
<p style="margin:24px 0;padding:18px;text-align:center;background:#fff7df;border:1px solid #e7c973;border-radius:10px;font-size:30px;font-weight:bold;letter-spacing:8px;color:#971b1f">${escapeHtml(code)}</p>
<p>El código vence en <strong>15 minutos</strong>. No lo compartas con nadie.</p>`),
});

export const passwordResetMail = (to: string, resetUrl: string): MailMessage => ({
  to,
  subject: 'Restablece tu contraseña de Academia CABSA',
  text: `Abre este enlace para definir una nueva contraseña: ${resetUrl}\n\nEl enlace vence en 60 minutos.`,
  html: shell('Restablece tu contraseña', `<p>Recibimos una solicitud para cambiar tu contraseña.</p>
<p style="margin:24px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:13px 20px;background:#971b1f;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Crear nueva contraseña</a></p>
<p>Este enlace vence en <strong>60 minutos</strong>.</p>`),
});

export const scholarshipActivatedMail = (
  to: string, displayName: string, membershipName: string, expiresAt?: string | null,
): MailMessage => ({
  to,
  subject: 'Tu beca CABSA fue activada',
  text: `Hola ${displayName}. Tu beca ${membershipName} fue activada correctamente.${expiresAt ? ` Vigente hasta: ${expiresAt}.` : ''}`,
  html: shell('Beca activada correctamente', `<p>Hola <strong>${escapeHtml(displayName)}</strong>.</p>
<p>Tu acceso <strong>${escapeHtml(membershipName)}</strong> ya está activo.</p>
${expiresAt ? `<p>Vigencia: <strong>hasta ${escapeHtml(expiresAt)}</strong>.</p>` : ''}
<p>Ya puedes ingresar a Academia CABSA y utilizar los recursos incluidos en tu beca.</p>`),
});

export const supportReplyMail = (
  to: string,
  name: string,
  folio: string,
  status: string,
  priority: string,
  reply: string,
): MailMessage => ({
  to,
  subject: `Actualización de soporte CABSA - ${folio}`,
  text: `Hola ${name}.\n\nTu petición ${folio} fue actualizada.\nEstado: ${status}\nPrioridad: ${priority}\n\nRespuesta de soporte:\n${reply}\n\nAcademia CABSA`,
  html: shell('Actualización de tu petición', `
    <p>Hola <strong>${escapeHtml(name || 'usuario')}</strong>.</p>
    <p>Tu petición de soporte fue actualizada.</p>
    <table role="presentation" cellspacing="0" cellpadding="7" style="margin:18px 0;background:#fff8e8;border-radius:8px">
      <tr><td><strong>Folio</strong></td><td>${escapeHtml(folio)}</td></tr>
      <tr><td><strong>Estado</strong></td><td>${escapeHtml(status)}</td></tr>
      <tr><td><strong>Prioridad</strong></td><td>${escapeHtml(priority)}</td></tr>
    </table>
    <p><strong>Respuesta de soporte:</strong></p>
    <div style="padding:16px;border-left:4px solid #c48a19;background:#faf7f1;white-space:pre-wrap">${escapeHtml(reply)}</div>`),
});
