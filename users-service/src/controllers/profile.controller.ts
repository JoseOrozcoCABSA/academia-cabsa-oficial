/**
 * @file Capa HTTP del perfil.
 *
 * Las tres rutas operan sobre la cuenta del token y ninguna acepta un
 * identificador por parametro, asi que no hay forma de leer ni modificar el
 * perfil de otro usuario.
 *
 * @see services/profile.service.ts Validaciones y reglas.
 */

import type { Request, Response } from 'express';
import service from '#services/profile.service';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

/**
 * Saca el identificador de la cuenta del token ya verificado.
 *
 * Depende de que `authMiddleware` haya corrido antes y dejado `request.auth`. Si
 * la ruta se monta sin el, el fallo aparece como 401
 * `INVALID_TOKEN_SUBJECT` —no como 500—, lo que despista: parece un problema de
 * credenciales cuando es de configuracion de rutas.
 *
 * @throws {AppError} 401 `INVALID_TOKEN_SUBJECT` si el token no trae `sub`.
 */
const authenticatedUserId = (request: Request): string => {
  const subject = request.auth?.sub;
  if (typeof subject !== 'string' || !subject) {
    throw new AppError(
      'No fue posible identificar la cuenta',
      401,
      'INVALID_TOKEN_SUBJECT',
    );
  }
  return subject;
};

/** Manejadores del perfil propio. */
export class ProfileController {
  /** `GET /profile` — Perfil del usuario del token, con su beca y su grupo. */
  show = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.getProfile(authenticatedUserId(request)));
  };

  /**
   * `PATCH /profile` — Actualiza el perfil y devuelve el resultado.
   *
   * El cuerpo pasa al servicio sin tocarlo.
   *
   * Incoherencia a corregir: el verbo es `PATCH`, que implica actualizacion
   * parcial, pero el servicio guarda como nulos los campos que no lleguen.
   * Se comporta como un `PUT`. Hoy hay que enviar el perfil completo, o se
   * borran los datos omitidos.
   */
  update = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.updateProfile(authenticatedUserId(request), request.body),
    );
  };

  /**
   * `PATCH /profile/password` — Cambia la contrasena.
   *
   * @returns 200 con `{ updated: true }`. Las sesiones abiertas siguen activas.
   */
  updatePassword = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(
      response,
      await service.updatePassword(authenticatedUserId(request), request.body),
    );
  };
}

/** Instancia de `ProfileController` lista para usar. */
export default new ProfileController();
