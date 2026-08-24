/**
 * @file Fachada de registro y autenticación.
 *
 * Conserva el contrato que consume `auth.controller.ts` y delega cada operación
 * en el servicio del caso de uso correspondiente. Antes este archivo contenía
 * las seis responsabilidades juntas —alta, acceso, verificación de correo,
 * restablecimiento de contraseña y los dos catálogos—, unas 620 líneas en las
 * que las reglas de negocio estaban mezcladas con las llamadas HTTP salientes.
 *
 * Reparto actual:
 *
 * | Operación | Implementación |
 * |---|---|
 * | `register` | `auth/registration.service.ts` |
 * | `login` | `auth/login.service.ts` |
 * | `verifyEmail`, `resendEmailVerification` | `auth/email-verification.service.ts` |
 * | `forgotPassword`, `resetPassword` | `auth/password-reset.service.ts` |
 * | `registrationCatalog`, `postalCode` | `auth/registration-catalog.service.ts` |
 *
 * Las validaciones que no necesitan base de datos viven aparte, en
 * `auth/registration-rules.ts` y `auth/credential-rules.ts`, y son las que
 * cubren las pruebas unitarias.
 *
 * @see auth.controller.ts Único consumidor de esta fachada.
 */

import emailVerificationService from './auth/email-verification.service.js';
import loginService, { type LoginInput } from './auth/login.service.js';
import passwordResetService, { type ResetPasswordInput } from './auth/password-reset.service.js';
import registrationCatalogService from './auth/registration-catalog.service.js';
import registrationService from './auth/registration.service.js';
import type { RegisterInput } from './auth/registration-rules.js';

export type { LoginInput, RegisterInput, ResetPasswordInput };

/**
 * Fachada de autenticación.
 *
 * No contiene reglas propias: cada método reenvía al servicio del caso de uso.
 * Existe para que el controlador y las rutas no tengan que cambiar cuando la
 * implementación se reorganiza.
 */
export class AuthService {
  /** Confirma el código de verificación y devuelve la sesión iniciada. */
  verifyEmail(input: { email?: string; code?: string }) {
    return emailVerificationService.verifyEmail(input);
  }

  /** Reenvía el código de verificación de correo. */
  resendEmailVerification(input: { email?: string }) {
    return emailVerificationService.resendEmailVerification(input);
  }

  /** Solicita el enlace de restablecimiento sin revelar si el correo existe. */
  forgotPassword(input: { email?: string }) {
    return passwordResetService.forgotPassword(input);
  }

  /** Consume el token de un solo uso y reemplaza la contraseña. */
  resetPassword(input: ResetPasswordInput) {
    return passwordResetService.resetPassword(input);
  }

  /** Datos fijos del formulario de alta: regiones FOMAQRO y rutas legales. */
  registrationCatalog() {
    return registrationCatalogService.registrationCatalog();
  }

  /** Resuelve un código postal en estado, municipio, ciudad y colonias. */
  postalCode(postalCode: string) {
    return registrationCatalogService.postalCode(postalCode);
  }

  /** Da de alta una cuenta con todas sus validaciones. */
  register(input: RegisterInput) {
    return registrationService.register(input);
  }

  /** Autentica con correo o usuario y emite el token. */
  login(input: LoginInput) {
    return loginService.login(input);
  }
}

/** Instancia única usada por el controlador. */
export default new AuthService();
