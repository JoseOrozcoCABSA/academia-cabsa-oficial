/**
 * @file Controlador de cuentas de usuario, sobre la tabla `usuarios_cuentas`.
 *
 * Instancia del controlador CRUD genérico fijada a su tabla; no implementa
 * comportamiento propio. Cubre la administración de cuentas: listado con
 * filtros, consulta, alta, modificación y baja.
 *
 * Ojo con el alcance: el alta y el acceso de los usuarios finales NO pasan por
 * aquí, sino por `auth.controller.ts`, que sí valida contraseña, términos y
 * duplicados. Este controlador es el CRUD administrativo de la tabla, y expone
 * sus columnas tal como están —incluida `password_hash`, que conviene filtrar
 * en el servicio si estas rutas se abren a perfiles no administradores.
 *
 * @see resources.controller.ts Comportamiento heredado y contrato de cada método.
 * @see auth.controller.ts      Registro y autenticación de usuarios finales.
 */

/** Servicio de datos de cuentas, inyectado en el controlador genérico. */
import service from '#services/users.service';
/** Controlador CRUD genérico del que se toma todo el comportamiento. */
import { ResourcesController } from '#controllers/resources.controller';

/**
 * Controlador listo para montar en las rutas de usuarios.
 *
 * El segundo argumento fija la tabla y gana sobre cualquier `:resource` de la
 * URL, de modo que estas rutas no pueden operar sobre otra tabla.
 */
export default new ResourcesController(service, 'usuarios_cuentas');
