/**
 * @file Modelo `SoaNotifications` — tabla `notificaciones_registros`.
 *
 * 15 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `user_id`: CHAR(36)  · NOT NULL
 * - `template_id`: CHAR(36)
 * - `channel`: ENUM("EMAIL", "WHATSAPP", "IN_APP", "SMS")  · NOT NULL
 * - `destination`: STRING(255)  · NOT NULL
 * - `subject`: STRING(255)
 * - `body`: TEXT("long")  · NOT NULL
 * - `status`: ENUM("PENDING", "QUEUED", "SENT", "DELIVERED", "FAILED", "CANCELLED")  · NOT NULL
 * - `scheduled_at`: DATE
 * - `sent_at`: DATE
 * - `delivered_at`: DATE
 * - `read_at`: DATE
 * - `metadata`: JSON
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_registros`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaNotifications.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaNotifications extends Model {}

SoaNotifications.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.CHAR(36), allowNull: false },
  "template_id": { type: DataTypes.CHAR(36), allowNull: true },
  "channel": { type: DataTypes.ENUM("EMAIL", "WHATSAPP", "IN_APP", "SMS"), allowNull: false },
  "destination": { type: DataTypes.STRING(255), allowNull: false },
  "subject": { type: DataTypes.STRING(255), allowNull: true },
  "body": { type: DataTypes.TEXT("long"), allowNull: false },
  "status": { type: DataTypes.ENUM("PENDING", "QUEUED", "SENT", "DELIVERED", "FAILED", "CANCELLED"), allowNull: false },
  "scheduled_at": { type: DataTypes.DATE, allowNull: true },
  "sent_at": { type: DataTypes.DATE, allowNull: true },
  "delivered_at": { type: DataTypes.DATE, allowNull: true },
  "read_at": { type: DataTypes.DATE, allowNull: true },
  "metadata": { type: DataTypes.JSON, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaNotifications',
  tableName: "notificaciones_registros",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
