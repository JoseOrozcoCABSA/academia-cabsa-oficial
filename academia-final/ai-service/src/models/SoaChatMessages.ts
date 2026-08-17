/**
 * @file Modelo `SoaChatMessages` — tabla `ia_mensajes_chat`.
 *
 * 10 columnas, 5 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `session_id`: CHAR(36)  · NOT NULL
 * - `role`: ENUM("SYSTEM", "USER", "ASSISTANT", "TOOL")  · NOT NULL
 * - `content`: TEXT("long")  · NOT NULL
 * - `tokens_input`: INTEGER
 * - `tokens_output`: INTEGER
 * - `model`: STRING(120)
 * - `citations`: JSON
 * - `metadata`: JSON
 * - `created_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_mensajes_chat`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaChatMessages.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaChatMessages extends Model {}

SoaChatMessages.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "session_id": { type: DataTypes.CHAR(36), allowNull: false },
  "role": { type: DataTypes.ENUM("SYSTEM", "USER", "ASSISTANT", "TOOL"), allowNull: false },
  "content": { type: DataTypes.TEXT("long"), allowNull: false },
  "tokens_input": { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  "tokens_output": { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  "model": { type: DataTypes.STRING(120), allowNull: true },
  "citations": { type: DataTypes.JSON, allowNull: true },
  "metadata": { type: DataTypes.JSON, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaChatMessages',
  tableName: "ia_mensajes_chat",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
