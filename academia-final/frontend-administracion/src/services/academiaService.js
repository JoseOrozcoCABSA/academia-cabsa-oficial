/**
 * @file `academiaService`: cliente CRUD apuntado a `/api/academia`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
/**
 * Cliente del servicio academico: cursos, lecciones, inscripciones y
 * certificados.
 */
export const academiaService = createResourceService('/api/academia');
