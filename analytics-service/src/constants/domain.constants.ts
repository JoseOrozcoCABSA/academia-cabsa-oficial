/**
 * Nombre del servicio, usado en el registro y en la respuesta de estado.
 *
 * Debe coincidir con la clave con la que el gateway enruta hacia aqui; si se
 * cambia solo en un lado, el registro atribuye las peticiones al servicio
 * equivocado.
 */
export const SERVICE = 'analytics-service';
/**
 * Tope de registros por pagina.
 *
 * `paginationFrom` recorta a este valor cualquier `limit` mayor, de modo que un
 * cliente no puede pedir la tabla completa en una sola peticion. La respuesta no
 * avisa de que se recorto: llegan 100 filas aunque se pidieran 5000.
 */
export const MAX_PAGE_SIZE = 100;
