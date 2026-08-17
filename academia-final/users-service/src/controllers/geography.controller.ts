/**
 * @file Controlador del catálogo geográfico, sobre la tabla `usuarios_estados`.
 *
 * No implementa nada propio: es una instancia del controlador CRUD genérico
 * fijada a su tabla. Todo el comportamiento HTTP —listado paginado con
 * filtros, consulta por id, alta, modificación y baja— viene de
 * {@link ResourcesController}.
 *
 * El archivo existe para dar un punto de montaje estable a
 * `routes/geography.routes.ts` y para declarar en un solo lugar a qué tabla
 * corresponde el recurso. Si la geografía necesitara reglas propias, el sitio
 * para añadirlas es `services/geography.service.ts`, no este archivo.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 */

/**
 * Servicio de datos de geografía. Se inyecta en el controlador para que las
 * reglas que se agreguen allí apliquen a estas rutas.
 */
import service from '#services/geography.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de geografía.
 *
 * El segundo argumento fija la tabla y tiene precedencia sobre cualquier
 * `:resource` que llegue en la URL: estas rutas no se pueden desviar a otra
 * tabla manipulando la petición.
 */
export default new ResourcesController(service, 'usuarios_estados');
