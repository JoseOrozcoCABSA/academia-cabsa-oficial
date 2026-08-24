/**
 * @file Controlador de registro y autenticación de usuarios finales.
 *
 * Es la puerta de entrada pública del servicio: las rutas de registro, acceso y
 * catálogos de alta se montan sin `authMiddleware`, porque quien las llama
 * todavía no tiene token. La única excepción es {@link AuthController.me}, que
 * sí lo exige.
 *
 * A diferencia del resto de los controladores del servicio, éste no deriva del
 * CRUD genérico: el alta de un usuario no es un `INSERT` sino un proceso con
 * validaciones, comprobación de duplicados, cifrado de contraseña y emisión de
 * token. Toda esa lógica vive en `auth.service.ts`; aquí sólo se traduce entre
 * HTTP y el servicio.
 *
 * @see auth.service.ts     Validaciones y reglas de negocio del registro y el acceso.
 * @see users.controller.ts CRUD administrativo de la tabla de cuentas.
 */

/** Tipos de Express. Sólo tipos: no llegan al paquete compilado. */
import type { Request, Response } from 'express';
/** Servicio de autenticación, donde están las reglas de negocio. */
import service from '#services/auth.service';
/** Formatea la respuesta con el sobre uniforme del proyecto. */
import { ok } from '#utils/response';
/** Manejadores para la entidad `auth`. */
import { AppError } from '#utils/errors';
import advisorService from '#services/advisor-management.service';

export class AuthController {
  /**
   * `GET /me` — Devuelve el contenido del token de quien llama.
   *
   * No consulta la base de datos: responde exactamente lo que `authMiddleware`
   * dejó en `request.auth` al verificar la firma. Por eso refleja el estado del
   * usuario **en el momento en que se emitió el token**; si sus roles o
   * permisos cambiaron después, aquí se seguirán viendo los anteriores hasta
   * que vuelva a iniciar sesión.
   *
   * Requiere `authMiddleware` en la ruta. Sin él, `request.auth` viene
   * indefinido y la respuesta sale vacía en lugar de dar 401.
   *
   * @returns 200 con el payload del token.
   */
  me = async (request: Request, response: Response): Promise<void> => {
    ok(response, request.auth);
  };

  /**
   * `GET /advisor/profile` — Devuelve el perfil del asesor.
   *
   * Requiere `authMiddleware` en la ruta.
   * Verifica que el usuario tenga rol de asesor.
   *
   * @returns 200 con los datos del perfil del asesor.
   */
  advisorProfile = async (request: Request, response: Response): Promise<void> => {
    // Ensure auth data exists
    if (!request.auth || !request.auth.sub) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    
    // Get the advisor data directly from advisor service
    const advisorData = await advisorService.getAdvisorProfile(request.auth.sub);
    
    // Explicit type safe merge to avoid TS2551 error
    const result = {
      ...request.auth,
      ...advisorData
    };
    
    // Ensure compatibility with potential type mismatches
    ok(response, result);
  };

  /**
   * `GET /postal-code/:code` — Resuelve un código postal en estado, municipio y colonias.
   *
   * @param request - Petición HTTP con código postal en parámetro.
   * @param response - Respuesta HTTP con datos del código postal.
   * @throws {AppError} 422 `INVALID_POSTAL_CODE` si no son cinco dígitos; 404
   *   `POSTAL_CODE_NOT_FOUND` si no está en el catálogo.
   */
  postalCode = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const postalCode = request.params.postalCode;
    ok(
      response,
      await service.postalCode(
        Array.isArray(postalCode) ? postalCode[0] : postalCode,
      ),
    );
  };

  /**
   * `GET /registration/catalog` — Devuelve catálogo estático de registro.
   *
   * @param request - Petición HTTP.
   * @param response - Respuesta HTTP con catálogo.
   */
  registrationCatalog = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(response, await service.registrationCatalog());
  };

  /**
   * `POST /register` — Da de alta una cuenta.
   *
   * @param request - Petición HTTP con registro.
   * @param response - Respuesta HTTP con el usuario nuevo.
   * @throws {AppError} 400 si faltan datos o son inválidos; 409 si ya existe
   *   el correo o usuario. Para el caso de correo, el mensaje no distingue si
   *   es porque ya existe el correo o el usuario.
   */
  register = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(response, await service.register(request.body));
  };

  /**
   * `POST /login` — Autentica con correo o nombre de usuario.
   *
   * @param request - Petición HTTP con credenciales.
   * @param response - Respuesta HTTP con el usuario y sesion.
   * @throws {AppError} 400 si faltan datos o son inválidos; 401 si las
   *   credenciales no son correctas; 403 si falta verificar el correo.
   */
  login = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(response, await service.login(request.body));
  };

  /**
   * `POST /forgot-password` — Solicita el enlace de restablecimiento sin revelar si el correo existe.
   *
   * @param request - Petición HTTP con correo.
   * @param response - Respuesta HTTP sin contenido.
   * @throws {AppError} 400 si falta el correo o es inválido.
   */
  forgotPassword = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    await service.forgotPassword(request.body);
    ok(response, null);
  };

  /**
   * `POST /reset-password` — Consume el token de un solo uso y reemplaza la contraseña.
   *
   * @param request - Petición HTTP con el token y nueva contraseña.
   * @param response - Respuesta HTTP sin contenido.
   * @throws {AppError} 400 si falta algo o es inválido; 401 si el token no es válido o ya se usó.
   */
  resetPassword = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    await service.resetPassword(request.body);
    ok(response, null);
  };

  /**
   * `POST /verify-email` — Confirma el código de verificación de correo.
   *
   * @param request - Petición HTTP con correo y código.
   * @param response - Respuesta HTTP con el usuario y sesión.
   * @throws {AppError} 400 si falta algo o es inválido; 401 si el código es incorrecto o expiró.
   */
  verifyEmail = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(response, await service.verifyEmail(request.body));
  };

  /**
   * `POST /resend-verification` — Reenvía el código de verificación de correo.
   *
   * @param request - Petición HTTP con correo.
   * @param response - Respuesta HTTP sin contenido.
   * @throws {AppError} 400 si falta el correo o es inválido.
   */
  resendVerification = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    await service.resendEmailVerification(request.body);
    ok(response, null);
  };
}

/** Instancia única lista para montar en `routes/auth.routes.ts`. */
export default new AuthController();