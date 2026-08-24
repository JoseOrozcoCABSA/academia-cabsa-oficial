/**
 * @file `contentService`: cliente CRUD apuntado a `/api/content`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
/** Cliente del servicio de contenido: capsulas y materiales de la mediateca. */
export const contentService = createResourceService('/api/content');
