/**
 * @file Controlador de mensajes de conversación.
 *
 * Cada registro es un turno del diálogo (del usuario o del asistente) ligado a
 * una conversación de `ia_conversaciones`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio. Estas rutas son el CRUD administrativo de la tabla: el
 * envío de un mensaje que además invoca al modelo no pasa por aquí.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/messages.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_mensajes` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_mensajes_chat');
