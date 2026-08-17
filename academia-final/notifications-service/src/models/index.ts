/**
 * @file Registro de recursos de `notifications-service`.
 *
 * Declara qué tablas expone el servicio por su API genérica: 7 en total,
 * 7 tablas y 0 vistas.
 *
 * Es la lista de lo accesible: una tabla que no esté aquí no se puede
 * consultar ni modificar por la API, aunque exista en la base de datos.
 *
 * @see repositories/resources.repository.ts Quien lo consulta en cada operación.
 */

import type { Model, ModelStatic } from 'sequelize';
import CabsaMailFiles from '#models/CabsaMailFiles';
import CabsaSoporteAdjuntos from '#models/CabsaSoporteAdjuntos';
import CabsaSoporteTickets from '#models/CabsaSoporteTickets';
import SoaNotificationDeliveryAttempts from '#models/SoaNotificationDeliveryAttempts';
import SoaNotifications from '#models/SoaNotifications';
import SoaNotificationTemplates from '#models/SoaNotificationTemplates';
import SoaReminders from '#models/SoaReminders';

/**
 * Descripcion de una tabla o vista expuesta por el servicio.
 *
 * Es lo que permite que un solo controlador generico sirva a todas las
 * entidades: en lugar de escribir codigo por tabla, se consulta este registro.
 *
 * - `tableType` distingue tabla de vista. Las vistas son de solo lectura y el
 *   repositorio rechaza escribir en ellas con 405 `READ_ONLY_RESOURCE`.
 * - `primaryKeys` puede tener mas de un elemento. En ese caso las rutas por
 *   `/:id` no sirven y hay que usar `/record` con todas las claves.
 */
export interface ResourceDefinition {
  model: ModelStatic<Model>;
  tableName: string;
  tableType: 'BASE TABLE' | 'VIEW';
  primaryKeys: string[];
}

/**
 * Registro de recursos indexado por nombre de tabla.
 *
 * La clave es el nombre real en la base de datos, y es lo que viaja en la URL
 * como `:resource`. Una tabla que no este aqui es inaccesible por la API, asi
 * que este archivo es tambien la lista de lo que el servicio expone.
 *
 * Se genera a partir del esquema; conviene regenerarlo tras una migracion en vez
 * de editarlo a mano.
 */
export type ResourceRegistry = Record<string, ResourceDefinition>;

const resources: ResourceRegistry = {
  "notificaciones_archivos_correo": { model: CabsaMailFiles, tableName: "notificaciones_archivos_correo", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_soporte_adjuntos": { model: CabsaSoporteAdjuntos, tableName: "notificaciones_soporte_adjuntos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_soporte_tickets": { model: CabsaSoporteTickets, tableName: "notificaciones_soporte_tickets", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_intentos_entrega": { model: SoaNotificationDeliveryAttempts, tableName: "notificaciones_intentos_entrega", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_registros": { model: SoaNotifications, tableName: "notificaciones_registros", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_plantillas": { model: SoaNotificationTemplates, tableName: "notificaciones_plantillas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "notificaciones_recordatorios": { model: SoaReminders, tableName: "notificaciones_recordatorios", tableType: "BASE TABLE", primaryKeys: ["id"] },
};

export default resources;
