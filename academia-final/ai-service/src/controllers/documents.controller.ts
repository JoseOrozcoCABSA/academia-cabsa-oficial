/**
 * @file Controlador de documentos indexados para RAG.
 *
 * Cada registro es un documento cuyo contenido se fragmenta y se vectoriza en
 * Qdrant para poder recuperarlo por similitud. Esta tabla guarda los metadatos
 * relacionales; los vectores viven fuera, en Qdrant.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio. Consecuencia práctica: borrar el registro aquí NO
 * elimina sus vectores de Qdrant. Hay que limpiar la colección aparte o los
 * fragmentos seguirán apareciendo en las búsquedas.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 *
*/

/** Servicio de datos ya fijado a esta entidad, inyectado en el controlador genérico. */
import service from '#services/documents.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de la entidad.
 *
 * El segundo argumento fija la tabla `ia_documentos` y tiene precedencia sobre
 * cualquier `:resource` que llegue en la URL, así que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 */
export default new ResourcesController(service, 'ia_documentos_rag');
