/**
 * @file `analyticsService`: cliente CRUD apuntado a `/api/analytics`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
/** Cliente del servicio de analitica: metricas, informes y gamificacion. */
export const analyticsService = createResourceService('/api/analytics');
