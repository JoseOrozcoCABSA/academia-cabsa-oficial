/**
 * @file Controlador de permisos, sobre la tabla `usuarios_permisos`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio.
 *
 * Aquí se administra el catálogo de permisos que después consume
 * `requirePermission`. Dos consecuencias prácticas al modificarlo:
 *
 * - La comparación en el middleware es exacta y sin jerarquías, así que la
 *   clave que se dé de alta debe coincidir carácter por carácter con la que
 *   usan las rutas (`usuarios.crear`, no `usuarios.*`).
 * - Renombrar o borrar un permiso deja sin efecto la protección de las rutas
 *   que lo exigen, y quienes lo tuvieran concedido dejarán de pasar. Conviene
 *   revisar `requirePermission(...)` en las rutas antes de tocar una clave.
 *
 * @see resources.controller.ts  Comportamiento heredado y contrato de cada método.
 * @see permission.middleware.ts Donde se comprueba cada permiso.
 */

/** Servicio de datos de permisos, inyectado en el controlador genérico. */
import service from '#services/permissions.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de permisos.
 *
 * El segundo argumento fija la tabla y tiene precedencia sobre el `:resource`
 * de la URL.
 */
export default new ResourcesController(service, 'usuarios_permisos');
