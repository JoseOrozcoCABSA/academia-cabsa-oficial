/**
 * @file Controlador de bases de conocimiento RAG.
 *
 * Cada registro describe una base de conocimiento: qué colección de Qdrant usa
 * y con qué parámetros se recupera el contexto que se le pasa al modelo.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio. Cambiar el nombre de la colección deja la base
 * apuntando a un destino inexistente en Qdrant, y las consultas dejarán de
 * devolver contexto sin que este servicio lo detecte.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/rag.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_bases_conocimiento_rag` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_bases_conocimiento_rag');
