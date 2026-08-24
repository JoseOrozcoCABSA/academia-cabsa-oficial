/**
 * @file Modelo `CabsaCapsulaAvances` — tabla `analitica_avances_capsulas`.
 *
 * 8 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `user_id`: BIGINT  · NOT NULL
 * - `post_id`: BIGINT  · NOT NULL
 * - `estatus`: STRING(30)  · NOT NULL
 * - `titulo`: TEXT
 * - `url`: TEXT
 * - `fecha_completado`: DATE  · NOT NULL
 * - `fecha_actualizado`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_avances_capsulas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaCapsulaAvances.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaCapsulaAvances extends Model {}

CabsaCapsulaAvances.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "post_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "estatus": { type: DataTypes.STRING(30), allowNull: false },
  "titulo": { type: DataTypes.TEXT, allowNull: true },
  "url": { type: DataTypes.TEXT, allowNull: true },
  "fecha_completado": { type: DataTypes.DATE, allowNull: false },
  "fecha_actualizado": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaCapsulaAvances',
  tableName: "analitica_avances_capsulas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
