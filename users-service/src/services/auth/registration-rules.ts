/**
 * @file Reglas puras de validación del alta de cuentas.
 *
 * No hace entrada/salida: no consulta la base, no llama a otros servicios y no
 * firma tokens. Recibe lo que mandó el cliente y devuelve datos ya normalizados,
 * o lanza {@link AppError} con el código que corresponda.
 *
 * Está separado de `registration.service.ts` justamente por eso: aquí vive todo
 * lo que se puede probar sin levantar MySQL ni suplantar repositorios, que es la
 * mayor parte de las reglas del registro.
 *
 * El orden de las comprobaciones es parte del contrato: el formulario del
 * frontend muestra el primer error que recibe, así que cambiarlo cambia lo que
 * ve el usuario.
 *
 * @see registration.service.ts Orquesta estas reglas con el repositorio.
 */

import { AppError } from '#utils/errors';
import { FOMAQRO_REGIONS } from '#constants/fomaqro.constants';

/** Expresión de correo aceptada en el alta y en el resto de los flujos de cuenta. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC de persona física o moral, ya normalizado a mayúsculas y sin separadores. */
export const RFC_PATTERN = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/u;

/** Nombre de usuario: 3–40 caracteres, letras, números, punto, guion o guion bajo. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;

/** Longitud mínima de contraseña admitida en alta y restablecimiento. */
export const MIN_PASSWORD_LENGTH = 8;

/** Datos del formulario de alta, tal como llegan del cliente y sin validar. */
export interface RegisterInput {
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  passwordConfirmation?: string;
  firstName?: string;
  lastName?: string;
  postalCode?: string;
  colonyId?: string | number;
  fomaqroMember?: 'yes' | 'no';
  rfc?: string;
  regionId?: string;
  fomaqroMunicipalityId?: string;
  terms?: boolean;
}

/** Identidad ya normalizada: correo en minúsculas, nombre partido y usuario en minúsculas. */
export interface RegistrationIdentity {
  email: string;
  fullName: string;
  firstName: string;
  lastName: string | null;
  username: string;
  password: string;
}

/** Ubicación derivada del catálogo, sea por código postal o por región FOMAQRO. */
export interface ResolvedLocation {
  postalCode: string | null;
  colony: string | null;
  municipalityCode: string | null;
  municipality: string | null;
  stateCode: string | null;
  state: string | null;
}

/** Datos de pertenencia a FOMAQRO ya validados contra el catálogo en código. */
export interface FomaqroMembership extends ResolvedLocation {
  rfc: string;
  regionId: string;
  regionName: string;
}

/**
 * Fila del catálogo de códigos postales que necesita {@link resolveAddress}.
 *
 * Es un subconjunto de `PostalAddressRecord` del repositorio: sólo las columnas
 * que intervienen en la resolución. Los códigos de municipio y estado son
 * anulables porque así están en el catálogo.
 */
export interface PostalAddressLike {
  colony_id: number;
  colony: string;
  municipality_code: string | null;
  municipality: string;
  state_code: string | null;
  state: string;
}

/** Normaliza un correo: recorta espacios y pasa a minúsculas. */
export const normalizeEmail = (email?: string): string =>
  email?.trim().toLowerCase() ?? '';

/** Indica si un correo tiene forma aceptable. */
export const isValidEmail = (email?: string): boolean =>
  EMAIL_PATTERN.test(normalizeEmail(email));

/**
 * Compone el nombre completo.
 *
 * Acepta `fullName` directo o la combinación de `firstName` y `lastName`, que es
 * como lo manda el formulario de alta cuando pide los apellidos por separado.
 */
export const resolveFullName = (input: RegisterInput): string =>
  input.fullName?.trim()
  || [input.firstName, input.lastName].filter(Boolean).join(' ').trim();

/**
 * Parte el nombre completo en nombre y apellidos.
 *
 * Respeta lo que el cliente haya mandado explícitamente; sólo si falta, usa la
 * primera palabra como nombre y el resto como apellidos.
 */
export const splitName = (
  fullName: string,
  input: RegisterInput,
): { firstName: string; lastName: string | null } => {
  const parts = fullName.split(/\s+/);
  const firstName = input.firstName?.trim() || parts.shift() || fullName;
  const lastName = input.lastName?.trim() || parts.join(' ') || null;
  return { firstName, lastName };
};

/**
 * Valida y normaliza la identidad del alta.
 *
 * Comprueba, en este orden: nombre completo presente y de 120 caracteres como
 * máximo, correo con forma válida, contraseña de al menos ocho caracteres,
 * confirmación coincidente, aceptación de términos y formato del nombre de
 * usuario.
 *
 * @throws {AppError} 400 `INVALID_REGISTRATION`, `PASSWORD_CONFIRMATION_MISMATCH`,
 *   `TERMS_REQUIRED` o `INVALID_USERNAME`, según la primera regla que falle.
 */
export const assertRegistrationIdentity = (
  input: RegisterInput,
): RegistrationIdentity => {
  const fullName = resolveFullName(input);
  if (!fullName || fullName.length > 120) {
    throw new AppError(
      'El nombre completo es obligatorio y no puede exceder 120 caracteres',
      400,
      'INVALID_REGISTRATION',
    );
  }
  const email = normalizeEmail(input.email);
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new AppError(
      'Captura un correo electrónico válido',
      400,
      'INVALID_REGISTRATION',
    );
  }
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      'La contraseña debe tener al menos 8 caracteres',
      400,
      'INVALID_REGISTRATION',
    );
  }
  if (input.password !== input.passwordConfirmation) {
    throw new AppError(
      'La confirmación de contraseña no coincide',
      400,
      'PASSWORD_CONFIRMATION_MISMATCH',
    );
  }
  if (input.terms !== true) {
    throw new AppError(
      'Debes aceptar los términos y condiciones',
      400,
      'TERMS_REQUIRED',
    );
  }
  const requestedUsername = input.username?.trim();
  if (!requestedUsername || !USERNAME_PATTERN.test(requestedUsername)) {
    throw new AppError(
      'El nombre de usuario debe tener entre 3 y 40 caracteres y solo puede incluir letras, números, punto, guion o guion bajo',
      400,
      'INVALID_USERNAME',
    );
  }
  const { firstName, lastName } = splitName(fullName, input);
  return {
    email,
    fullName,
    firstName,
    lastName,
    username: requestedUsername.toLowerCase(),
    password: input.password,
  };
};

/**
 * Exige que el alta declare si la persona pertenece a FOMAQRO.
 *
 * La respuesta decide qué datos de ubicación se piden después, por lo que no
 * admite valor por omisión.
 *
 * @throws {AppError} 400 `FOMAQRO_ANSWER_REQUIRED` si falta o no es `yes`/`no`.
 */
export const assertFomaqroAnswer = (input: RegisterInput): 'yes' | 'no' => {
  if (input.fomaqroMember !== 'yes' && input.fomaqroMember !== 'no') {
    throw new AppError(
      'Indica si eres parte de FOMAQRO',
      400,
      'FOMAQRO_ANSWER_REQUIRED',
    );
  }
  return input.fomaqroMember;
};

/**
 * Valida la pertenencia a FOMAQRO contra el catálogo en código.
 *
 * El estado queda fijado a Querétaro (`22`) porque FOMAQRO es un fondo estatal:
 * todas sus regiones pertenecen a esa entidad.
 *
 * @throws {AppError} 422 `INVALID_RFC` si el RFC no tiene forma válida;
 *   422 `INVALID_FOMAQRO_REGION` si la región o el municipio no existen o no se
 *   corresponden entre sí.
 */
export const assertFomaqroMembership = (
  input: RegisterInput,
): FomaqroMembership => {
  const rfc = input.rfc?.toUpperCase().replace(/[^A-Z0-9&Ñ]/gu, '') ?? '';
  if (!RFC_PATTERN.test(rfc)) {
    throw new AppError('Captura un RFC válido para continuar', 422, 'INVALID_RFC');
  }
  const region = input.regionId ? FOMAQRO_REGIONS[input.regionId] : null;
  if (
    !region
    || !input.fomaqroMunicipalityId
    || !region.municipalities[input.fomaqroMunicipalityId]
  ) {
    throw new AppError(
      'Selecciona una región y municipio FOMAQRO válidos',
      422,
      'INVALID_FOMAQRO_REGION',
    );
  }
  return {
    rfc,
    regionId: input.regionId as string,
    regionName: region.label,
    postalCode: null,
    colony: null,
    municipalityCode: input.fomaqroMunicipalityId,
    municipality: region.municipalities[input.fomaqroMunicipalityId],
    stateCode: '22',
    state: 'Querétaro',
  };
};

/**
 * Comprueba que el alta sin FOMAQRO traiga código postal y colonia.
 *
 * Sólo valida la forma; que la pareja exista en el catálogo lo decide
 * {@link resolveAddress} con las filas ya consultadas.
 *
 * @throws {AppError} 400 `ADDRESS_REQUIRED` si falta cualquiera de los dos.
 */
export const assertAddressRequest = (
  input: RegisterInput,
): { postalCode: string; colonyId: number } => {
  const postalCode = input.postalCode?.replace(/\D/g, '') ?? '';
  const colonyId = Number(input.colonyId);
  if (!postalCode || !/^\d{5}$/.test(postalCode) || !colonyId) {
    throw new AppError(
      'Captura tu código postal y selecciona una colonia',
      400,
      'ADDRESS_REQUIRED',
    );
  }
  return { postalCode, colonyId };
};

/**
 * Empareja la colonia elegida con el código postal declarado.
 *
 * El cliente manda ambos por separado y podría combinarlos de forma incoherente,
 * así que la relación se comprueba contra el catálogo y no contra el formulario.
 *
 * @param records Filas del catálogo para ese código postal.
 * @throws {AppError} 422 `INVALID_ADDRESS` si la colonia no pertenece al código.
 */
export const resolveAddress = (
  records: PostalAddressLike[],
  postalCode: string,
  colonyId: number,
): ResolvedLocation => {
  const address = records.find((record) => record.colony_id === colonyId);
  if (!address) {
    throw new AppError(
      'El código postal y la colonia no coinciden con el catálogo',
      422,
      'INVALID_ADDRESS',
    );
  }
  return {
    postalCode,
    colony: address.colony,
    municipalityCode: address.municipality_code,
    municipality: address.municipality,
    stateCode: address.state_code,
    state: address.state,
  };
};
