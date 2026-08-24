/**
 * @file Modelo `SoaReminders` — tabla `notificaciones_recordatorios`.
 *
 * 12 columnas, 10 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `user_id`: CHAR(36)  · NOT NULL
 * - `related_type`: STRING(80)  · NOT NULL
 * - `related_id`: STRING(100)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `message`: TEXT
 * - `remind_at`: DATE  · NOT NULL
 * - `recurrence`: STRING(80)
 * - `channels`: JSON  · NOT NULL
 * - `status`: ENUM("ACTIVE", "COMPLETED", "CANCELLED")  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_recordatorios`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaReminders.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaReminders extends Model {}

SoaReminders.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.CHAR(36), allowNull: false },
  "related_type": { type: DataTypes.STRING(80), allowNull: false },
  "related_id": { type: DataTypes.STRING(100), allowNull: false },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "message": { type: DataTypes.TEXT, allowNull: true },
  "remind_at": { type: DataTypes.DATE, allowNull: false },
  "recurrence": { type: DataTypes.STRING(80), allowNull: true },
  "channels": { type: DataTypes.JSON, allowNull: false },
  "status": { type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaReminders',
  tableName: "notificaciones_recordatorios",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
