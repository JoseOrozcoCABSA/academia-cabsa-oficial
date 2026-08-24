/**
 * @file Controlador del catálogo de plantillas de prompt.
 *
 * Guarda los prompts reutilizables que el servicio de IA inyecta al construir
 * una petición al modelo: la plantilla y sus variables viven en base de datos y
 * no en el código, de modo que se pueden ajustar sin volver a desplegar.
 *
 * Es una instancia del controlador CRUD genérico fijada a su tabla; no
 * implementa comportamiento propio. Al ser contenido que llega al modelo,
 * conviene restringir la escritura con `requirePermission` en las rutas: un
 * cambio aquí altera el comportamiento del asistente en producción.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/prompts.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_plantillas_prompts` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_plantillas_prompts');
