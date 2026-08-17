/**
 * @file `notificationsService`: cliente CRUD apuntado a `/api/notifications`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
import { apiClient } from '@/services/apiClient';
/** Cliente del servicio de notificaciones: avisos, plantillas y soporte. */
export const notificationsService = createResourceService('/api/notifications');

export const mailService = {
  sendBatch: (formData) => apiClient('/api/notifications/mail/send-batch', {
    method: 'POST',
    body: formData,
  }),
};
