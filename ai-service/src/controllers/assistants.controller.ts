/**
 * @file Controlador de asistentes de IA.
 *
 * Cada registro define un asistente: su modelo, su prompt de sistema y sus
 * parámetros. Es la configuración que consume el servicio de chat para decidir
 * cómo responde cada agente.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/assistants.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_asistentes` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_asistentes');
