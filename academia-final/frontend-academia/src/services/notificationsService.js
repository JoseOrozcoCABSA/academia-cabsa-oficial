/**
 * @file `notificationsService`: cliente CRUD apuntado a `/api/notifications`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
/** Cliente del servicio de notificaciones: avisos, plantillas y soporte. */
export const notificationsService = createResourceService('/api/notifications');
