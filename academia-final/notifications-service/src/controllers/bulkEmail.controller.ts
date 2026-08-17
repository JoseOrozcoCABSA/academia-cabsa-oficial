import type { Request, Response } from 'express';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';
import { sendMail } from '#services/mailer.service';

interface Recipient { email: string; code?: string }

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const validEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const sendBulkEmail = async (request: Request, response: Response): Promise<void> => {
  const subject = String(request.body.subject ?? '').trim();
  const body = String(request.body.message ?? '').trim();
  const mode = String(request.body.mode ?? 'message');
  let recipients: Recipient[];
  try {
    recipients = JSON.parse(String(request.body.recipients ?? '[]')) as Recipient[];
  } catch {
    throw new AppError('La lista de destinatarios no es válida', 400, 'INVALID_RECIPIENTS');
  }
  if (!subject || !body || !Array.isArray(recipients) || recipients.length < 1 || recipients.length > 5) {
    throw new AppError('Cada lote requiere asunto, mensaje y de 1 a 5 destinatarios', 400, 'INVALID_MAIL_BATCH');
  }
  const needsCodes = mode === 'codes' || mode === 'codes_attachments';
  const needsFiles = mode === 'attachments' || mode === 'codes_attachments';
  if (!['message', 'codes', 'attachments', 'codes_attachments'].includes(mode)) {
    throw new AppError('Modo de envío no válido', 400, 'INVALID_MAIL_MODE');
  }
  if (recipients.some((item) => !item || !validEmail(String(item.email ?? '')))) {
    throw new AppError('El lote contiene un correo no válido', 400, 'INVALID_RECIPIENTS');
  }
  if (needsCodes && recipients.some((item) => !String(item.code ?? '').trim())) {
    throw new AppError('Falta un código para uno de los correos', 400, 'MISSING_MAIL_CODE');
  }
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  if (needsFiles && !files.length) {
    throw new AppError('Selecciona al menos un archivo adjunto', 400, 'ATTACHMENT_REQUIRED');
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > 25 * 1024 * 1024) {
    throw new AppError('El total de adjuntos no puede superar 25 MB', 400, 'ATTACHMENT_TOTAL_LIMIT');
  }
  const attachments = files.map((file) => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype,
  }));
  const settled = await Promise.allSettled(recipients.map((recipient) => {
    const code = String(recipient.code ?? '').trim();
    const codeText = needsCodes ? `\n\nTu código asignado es: ${code}` : '';
    const codeHtml = needsCodes
      ? `<p style="margin:22px 0;padding:14px;background:#fff7df;border:1px solid #e7c973;border-radius:8px"><strong>Código asignado:</strong> <span style="font-family:monospace;font-size:18px">${escapeHtml(code)}</span></p>`
      : '';
    return sendMail({
      to: recipient.email,
      subject,
      text: `${body}${codeText}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#34251f"><div style="color:#971b1f;font-weight:bold">Academia CABSA</div><p>${escapeHtml(body).replaceAll('\n', '<br>')}</p>${codeHtml}</div>`,
      attachments,
    });
  }));
  const results = settled.map((result, index) => ({
    email: recipients[index].email,
    sent: result.status === 'fulfilled',
    error: result.status === 'rejected' ? 'No fue posible entregar el correo' : null,
  }));
  ok(response, {
    results,
    sent: results.filter((item) => item.sent).length,
    failed: results.filter((item) => !item.sent).length,
  });
};
