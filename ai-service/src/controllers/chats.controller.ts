/**
 * @file Controlador de conversaciones.
 *
 * Una conversación agrupa los mensajes intercambiados con un asistente. Los
 * mensajes en sí viven en su propia tabla y se administran desde
 * `messages.controller.ts`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio. Ojo al borrar: el borrado es físico y no cascada desde
 * aquí, así que eliminar una conversación puede dejar mensajes huérfanos si la
 * base de datos no define la restricción.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/chats.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_conversaciones` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_sesiones_chat');
