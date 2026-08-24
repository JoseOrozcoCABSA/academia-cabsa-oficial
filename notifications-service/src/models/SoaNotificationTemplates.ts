/**
 * @file Modelo `SoaNotificationTemplates` — tabla `notificaciones_plantillas`.
 *
 * 10 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `code`: STRING(100)  · NOT NULL
 * - `name`: STRING(160)  · NOT NULL
 * - `channel`: ENUM("EMAIL", "WHATSAPP", "IN_APP", "SMS")  · NOT NULL
 * - `subject_template`: STRING(255)
 * - `body_template`: TEXT("long")  · NOT NULL
 * - `variables`: JSON
 * - `is_active`: BOOLEAN  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_plantillas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaNotificationTemplates.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaNotificationTemplates extends Model {}

SoaNotificationTemplates.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "code": { type: DataTypes.STRING(100), allowNull: false },
  "name": { type: DataTypes.STRING(160), allowNull: false },
  "channel": { type: DataTypes.ENUM("EMAIL", "WHATSAPP", "IN_APP", "SMS"), allowNull: false },
  "subject_template": { type: DataTypes.STRING(255), allowNull: true },
  "body_template": { type: DataTypes.TEXT("long"), allowNull: false },
  "variables": { type: DataTypes.JSON, allowNull: true },
  "is_active": { type: DataTypes.BOOLEAN, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaNotificationTemplates',
  tableName: "notificaciones_plantillas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
