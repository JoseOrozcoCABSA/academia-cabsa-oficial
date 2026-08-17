/**
 * @file Servicio `supportService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones (3):
 * - `list()`
 * - `create({ topic, subject, message, name, files })`
 * - `downloadAttachment(attachment)`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { API_URL } from '@/config/api';
import { TOKEN_KEY } from '@/config/constants';
import { apiClient } from '@/services/apiClient';

const basePath = '/api/notifications/support';

/**
 * Tickets de soporte del usuario.
 *
 * `create` envia `FormData` porque lleva adjuntos; en ese caso `apiClient` no
 * fija `Content-Type` y deja que el navegador escriba el delimitador.
 */
export const supportService = {
  list: () => apiClient(basePath),

  create: ({ topic, subject, message, name, files }) => {
    const body = new FormData();
    body.append('topic', topic);
    body.append('subject', subject);
    body.append('message', message);
    if (name) body.append('name', name);
    files.forEach((file) => body.append('attachments', file));
    return apiClient(basePath, { method: 'POST', body });
  },

  downloadAttachment: async (attachment) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(
      `${API_URL}${basePath}/attachments/${attachment.id}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) throw new Error('No fue posible descargar la evidencia.');

    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = attachment.archivo_nombre || 'evidencia';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  },
};
