/**
 * @file Controlador de `support`, sobre la tabla `notificaciones_soporte_tickets`.
 *
 * Instancia de `ResourcesController` sin comportamiento propio: aporta el
 * capa HTTP con el CRUD completo: listado paginado con filtros, consulta por id, alta, modificación y baja.
 *
 * La tabla queda fijada en la instancia y tiene precedencia sobre cualquier
 * `:resource` que llegue en la URL, de modo que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 *
 * Si esta entidad necesitara reglas propias, el lugar para añadirlas es su
 * servicio, no este archivo.
 *
 * @see controllers/resources.controller.ts Comportamiento heredado.
 */

import service from '#services/support.service';
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Instancia lista para usar, fijada a la tabla `notificaciones_soporte_tickets`.
 */
export default new ResourcesController(service, 'notificaciones_soporte_tickets');
