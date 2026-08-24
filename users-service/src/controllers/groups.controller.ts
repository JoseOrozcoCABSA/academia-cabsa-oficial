/**
 * @file Controlador de grupos, sobre la tabla `usuarios_grupos`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio.
 *
 * Los grupos son la agrupación organizativa de CABSA (la pertenencia de cada
 * usuario vive en su tabla puente). A diferencia de los roles, los grupos no
 * intervienen en la autorización: no se comprueban en ningún middleware. Sirven
 * para segmentar y reportar, no para conceder acceso.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 * @see roles.controller.ts     Lo que sí determina el acceso.
 */

/** Servicio de datos de grupos, inyectado en el controlador genérico. */
import service from '#services/groups.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de grupos.
 *
 * El segundo argumento fija la tabla y tiene precedencia sobre el `:resource`
 * de la URL.
 */
export default new ResourcesController(service, 'usuarios_grupos');
