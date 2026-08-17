/**
 * @file Modelo `SoaNotificationDeliveryAttempts` — tabla `notificaciones_intentos_entrega`.
 *
 * 10 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `notification_id`: CHAR(36)  · NOT NULL
 * - `provider`: STRING(80)  · NOT NULL
 * - `provider_message_id`: STRING(255)
 * - `attempt_number`: INTEGER  · NOT NULL
 * - `status`: STRING(40)  · NOT NULL
 * - `response_code`: STRING(40)
 * - `response_body`: TEXT
 * - `attempted_at`: DATE  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_intentos_entrega`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaNotificationDeliveryAttempts.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaNotificationDeliveryAttempts extends Model {}

SoaNotificationDeliveryAttempts.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "notification_id": { type: DataTypes.CHAR(36), allowNull: false },
  "provider": { type: DataTypes.STRING(80), allowNull: false },
  "provider_message_id": { type: DataTypes.STRING(255), allowNull: true },
  "attempt_number": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "status": { type: DataTypes.STRING(40), allowNull: false },
  "response_code": { type: DataTypes.STRING(40), allowNull: true },
  "response_body": { type: DataTypes.TEXT, allowNull: true },
  "attempted_at": { type: DataTypes.DATE, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaNotificationDeliveryAttempts',
  tableName: "notificaciones_intentos_entrega",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
