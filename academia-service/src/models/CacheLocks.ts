/**
 * @file Modelo `CacheLocks` — tabla `academia_cache_bloqueos`.
 *
 * 3 columnas, 3 obligatorias.
 * Clave primaria: `key`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `key`: STRING(255)  · PK · NOT NULL
 * - `owner`: STRING(255)  · NOT NULL
 * - `expiration`: BIGINT  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_cache_bloqueos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CacheLocks.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CacheLocks extends Model {}

CacheLocks.init({
  "key": { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  "owner": { type: DataTypes.STRING(255), allowNull: false },
  "expiration": { type: DataTypes.BIGINT, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CacheLocks',
  tableName: "academia_cache_bloqueos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
