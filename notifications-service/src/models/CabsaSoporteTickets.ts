/**
 * @file Modelo `CabsaSoporteTickets` — tabla `notificaciones_soporte_tickets`.
 *
 * 17 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `folio`: STRING(40)  · NOT NULL
 * - `user_id`: BIGINT
 * - `tipo_acceso`: STRING(30)  · NOT NULL
 * - `nombre`: STRING(190)
 * - `correo`: STRING(190)
 * - `usuario_login`: STRING(190)
 * - `tema`: STRING(190)
 * - `asunto`: STRING(255)  · NOT NULL
 * - `descripcion`: TEXT('long')  · NOT NULL
 * - `estado`: STRING(40)  · NOT NULL
 * - `prioridad`: STRING(40)  · NOT NULL
 * - `asignado_a`: BIGINT
 * - `respuesta_admin`: TEXT('long')
 * - `creado_en`: DATE  · NOT NULL
 * - `actualizado_en`: DATE  · NOT NULL
 * - `cerrado_en`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_soporte_tickets`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaSoporteTickets.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaSoporteTickets extends Model {}

CabsaSoporteTickets.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  folio: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  tipo_acceso: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'interno' },
  nombre: { type: DataTypes.STRING(190), allowNull: true },
  correo: { type: DataTypes.STRING(190), allowNull: true },
  usuario_login: { type: DataTypes.STRING(190), allowNull: true },
  tema: { type: DataTypes.STRING(190), allowNull: true },
  asunto: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT('long'), allowNull: false },
  estado: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'nuevo' },
  prioridad: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'normal' },
  asignado_a: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  respuesta_admin: { type: DataTypes.TEXT('long'), allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false },
  actualizado_en: { type: DataTypes.DATE, allowNull: false },
  cerrado_en: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaSoporteTickets',
  tableName: 'notificaciones_soporte_tickets',
  timestamps: false,
  freezeTableName: true,
});
