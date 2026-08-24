/**
 * @file Comprobación de permisos en la interfaz.
 */

/**
 * Indica si se debe mostrar algo que requiere un permiso.
 *
 * **Atención — concede el permiso cuando el usuario no trae lista de permisos.**
 * La expresión es «no hay lista, o la lista lo incluye», de modo que un usuario
 * sin `permissions` pasa todas las comprobaciones. Puede ser intencional para no
 * ocultar la interfaz mientras carga el perfil, pero significa que esta función
 * no sirve para ocultar acciones sensibles.
 *
 * Es sólo presentación: el permiso real lo verifica `requirePermission` en cada
 * servicio.
 *
 * @param {object} user Usuario en curso.
 * @param {string} permission Clave del permiso, p. ej. `usuarios.crear`.
 * @returns {boolean}
 */
export const can = (user, permission) => (user?.roles || []).some((role) => ['ADMIN', 'SUPER_ADMIN', 'administrator'].includes(role))
  || (Array.isArray(user?.permissions) && user.permissions.includes(permission));
