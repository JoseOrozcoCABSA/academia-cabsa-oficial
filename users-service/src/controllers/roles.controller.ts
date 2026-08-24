/**
 * @file Controlador de roles, sobre la tabla `usuarios_roles`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio.
 *
 * Los roles son la mitad del modelo de autorización: `usuarios_roles` define
 * los roles y `usuarios_permisos` los permisos, y la relación entre ambos vive
 * en su tabla puente. Un cambio hecho por estas rutas afecta a lo que el token
 * llevará dentro a partir del siguiente inicio de sesión: los tokens ya
 * emitidos conservan los permisos que tenían, porque `authMiddleware` sólo
 * verifica la firma y no vuelve a consultar la base de datos.
 *
 * @see resources.controller.ts    Comportamiento heredado y contrato de cada método.
 * @see permission.middleware.ts   Donde se comprueban los permisos del token.
 */

/** Servicio de datos de roles, inyectado en el controlador genérico. */
import service from '#services/roles.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de roles.
 *
 * El segundo argumento fija la tabla y tiene precedencia sobre el `:resource`
 * de la URL.
 */
export default new ResourcesController(service, 'usuarios_roles');
