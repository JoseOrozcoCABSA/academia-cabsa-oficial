/**
 * @file Repositorio de `messages`, sobre la tabla `ia_mensajes_chat`.
 *
 * Instancia de `ResourcesRepository` sin comportamiento propio: aporta el
 * acceso a datos con las garantías de seguridad del repositorio genérico.
 *
 * La tabla queda fijada en la instancia y tiene precedencia sobre cualquier
 * `:resource` que llegue en la URL, de modo que estas rutas no se pueden
 * desviar a otra tabla manipulando la petición.
 *
 * Si esta entidad necesitara reglas propias, el lugar para añadirlas es su
 * servicio, no este archivo.
 *
 * @see repositories/resources.repository.ts Comportamiento heredado.
 */

import { ResourcesRepository } from '#repositories/resources.repository';

/**
 * Instancia lista para usar, fijada a la tabla `ia_mensajes_chat`.
 */
export default new ResourcesRepository('ia_mensajes_chat');
