/**
 * @file Modelo `SoaChatSessions` — tabla `ia_sesiones_chat`.
 *
 * 9 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `user_id`: CHAR(36)  · NOT NULL
 * - `assistant_id`: CHAR(36)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `status`: ENUM("ACTIVE", "CLOSED", "ARCHIVED")  · NOT NULL
 * - `context`: JSON
 * - `last_message_at`: DATE
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_sesiones_chat`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaChatSessions.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaChatSessions extends Model {}

SoaChatSessions.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.CHAR(36), allowNull: false },
  "assistant_id": { type: DataTypes.CHAR(36), allowNull: false },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "status": { type: DataTypes.ENUM("ACTIVE", "CLOSED", "ARCHIVED"), allowNull: false },
  "context": { type: DataTypes.JSON, allowNull: true },
  "last_message_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaChatSessions',
  tableName: "ia_sesiones_chat",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
