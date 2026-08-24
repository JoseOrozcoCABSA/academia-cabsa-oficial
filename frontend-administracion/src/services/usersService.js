/**
 * @file `usersService`: cliente CRUD apuntado a `/api/users`.
 *
 * Toda su implementación viene de la fábrica; este archivo solo fija el prefijo
 * del servicio en el gateway.
 *
 * @see resourceService.js Operaciones que expone.
 */

import { createResourceService } from '@/services/resourceService';
/** Cliente del servicio de usuarios: cuentas, roles, permisos y grupos. */
export const usersService = createResourceService('/api/users');
