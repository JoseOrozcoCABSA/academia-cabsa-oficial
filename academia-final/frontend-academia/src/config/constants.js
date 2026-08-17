/**
 * @file Constantes de la aplicación.
 */

export const APP_NAME = 'Academia CABSA';

/**
 * Clave de almacenamiento del token.
 *
 * `apiClient` lo busca primero en `localStorage` y luego en `sessionStorage`, así
 * que la elección entre sesión persistente o de pestaña se hace al guardarlo, en
 * el inicio de sesión.
 */
export const TOKEN_KEY = 'cabsa_access_token';

/** Clave del usuario en curso, guardado como JSON. */
export const USER_KEY = 'cabsa_current_user';

/** Tamaño de página por defecto en los listados. */
export const PAGE_SIZE = 24;

/**
 * Traducciones de estado para mostrar en pantalla.
 *
 * Mezcla claves en mayúsculas y en minúsculas porque provienen de tablas
 * distintas: las de usuarios usan `ACTIVE`/`INACTIVE` y las de contenido
 * `published`/`draft`. La búsqueda es sensible a mayúsculas, de modo que un
 * estado con otra grafía no se traduce y se mostraría en crudo.
 */
export const STATUS_LABELS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  published: 'Publicado',
  draft: 'Borrador',
  completed: 'Completado',
  in_progress: 'En progreso',
  pending: 'Pendiente',
};
