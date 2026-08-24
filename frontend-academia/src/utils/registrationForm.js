/**
 * @file Reglas puras del formulario de alta.
 *
 * Sin React y sin llamadas a la API: recibe el formulario y devuelve el
 * siguiente. Se separa de la página para poder probar la limpieza de campos
 * dependientes, que es donde estaban los errores difíciles de ver —una colonia
 * que sobrevive al cambio de código postal deja un identificador huérfano que el
 * backend rechaza con 422.
 *
 * Es el reflejo en el cliente de `users-service/src/services/auth/registration-rules.ts`.
 * La validación de verdad es la del servidor; ésta sólo evita estados imposibles.
 */

/** Formulario vacío del alta. */
export const initialRegistrationForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  postalCode: '',
  colonyId: '',
  fomaqroMember: '',
  rfc: '',
  regionId: '',
  fomaqroMunicipalityId: '',
  terms: false,
};

/**
 * Descarta lo que no sea dígito y corta a cinco caracteres.
 *
 * Así el campo nunca queda en un estado que la búsqueda no acepte.
 */
export const sanitizePostalCode = (value) =>
  String(value ?? '').replace(/\D/g, '').slice(0, 5);

/**
 * Aplica el cambio de un campo limpiando los que dependen de él.
 *
 * Las dependencias son:
 * - cambiar el código postal invalida la colonia elegida;
 * - cambiar la región invalida el municipio FOMAQRO;
 * - responder que sí a FOMAQRO descarta el domicilio, y responder que no
 *   descarta RFC, región y municipio.
 *
 * @param form Formulario actual.
 * @param field Campo que cambia.
 * @param value Valor nuevo.
 * @returns Un formulario nuevo; no muta el recibido.
 */
export const applyFieldChange = (form, field, value) => {
  const next = { ...form, [field]: value };
  if (field === 'postalCode') {
    next.postalCode = sanitizePostalCode(value);
    next.colonyId = '';
  }
  if (field === 'regionId') next.fomaqroMunicipalityId = '';
  if (field === 'fomaqroMember' && value === 'yes') {
    next.postalCode = '';
    next.colonyId = '';
  }
  if (field === 'fomaqroMember' && value === 'no') {
    next.rfc = '';
    next.regionId = '';
    next.fomaqroMunicipalityId = '';
  }
  return next;
};

/**
 * Lee el valor de un evento de formulario.
 *
 * Las casillas de verificación llevan el dato en `checked`, no en `value`.
 */
export const fieldValueFrom = (event) =>
  event.target.type === 'checkbox' ? event.target.checked : event.target.value;

/**
 * Indica si el código postal tiene la longitud que dispara la búsqueda.
 */
export const isPostalCodeComplete = (postalCode) =>
  sanitizePostalCode(postalCode).length === 5;

/**
 * Mensaje de estado tras resolver un código postal.
 *
 * Con una sola colonia se confirma; con varias se pide elegir.
 */
export const postalStatusFor = (colonies) =>
  colonies.length === 1
    ? 'Ubicación encontrada. Confirma la colonia.'
    : `Ubicación encontrada. Selecciona una de las ${colonies.length} colonias disponibles.`;

/** Mensaje inicial mientras el código postal está incompleto. */
export const POSTAL_PROMPT = 'Captura un código postal de cinco dígitos.';
