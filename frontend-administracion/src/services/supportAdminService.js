import { API_URL } from '@/config/api';
import { TOKEN_KEY } from '@/config/constants';
import { apiClient } from '@/services/apiClient';

const query = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, String(value));
  });
  return params.toString();
};

const attachmentResponse = async (attachment, inline = false) => {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(
    `${API_URL}/api/notifications/support/admin/attachments/${encodeURIComponent(attachment.id)}${inline ? '?disposition=inline' : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    let message = response.status === 404
      ? 'El registro existe, pero el archivo físico ya no está disponible. Puede haberse perdido en una reconstrucción anterior del contenedor.'
      : 'No fue posible abrir el adjunto.';
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      const payload = await response.json().catch(() => null);
      message = payload?.message || payload?.error?.message || message;
    }
    throw new Error(message);
  }
  return response;
};

export const supportAdminService = {
  dashboard: (filters) => apiClient(`/api/notifications/support/admin?${query(filters)}`),
  update: (id, values) => apiClient(`/api/notifications/support/admin/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  }),
  previewAttachment: async (attachment) => {
    const response = await attachmentResponse(attachment, true);
    const blob = await response.blob();
    return {
      blob,
      mimeType: blob.type || attachment.mime_type || 'application/octet-stream',
      url: URL.createObjectURL(blob),
    };
  },
  downloadAttachment: async (attachment) => {
    const response = await attachmentResponse(attachment);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.archivo_nombre || 'evidencia';
    link.click();
    URL.revokeObjectURL(url);
  },
};
