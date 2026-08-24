/**
 * @file Modelo `Sessions` — tabla `usuarios_sesiones`.
 *
 * 6 columnas, 3 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: STRING(255)  · PK · NOT NULL
 * - `user_id`: BIGINT
 * - `ip_address`: STRING(45)
 * - `user_agent`: TEXT
 * - `payload`: TEXT("long")  · NOT NULL
 * - `last_activity`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_sesiones`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Sessions.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Sessions extends Model {}

Sessions.init({
  "id": { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "ip_address": { type: DataTypes.STRING(45), allowNull: true },
  "user_agent": { type: DataTypes.TEXT, allowNull: true },
  "payload": { type: DataTypes.TEXT("long"), allowNull: false },
  "last_activity": { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize: database,
  modelName: 'Sessions',
  tableName: "usuarios_sesiones",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
