/**
 * @file Reexporta las funciones de JWT para que se puedan importar desde utils.
 *
 * No añade nada: existe sólo por comodidad de importación. La implementación
 * está en `config/jwt.ts`.
 */

import { signToken, verifyToken } from '#config/jwt';

export { signToken, verifyToken };
