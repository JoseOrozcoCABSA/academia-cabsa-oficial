/**
 * @file Modelo `CabsaRachas` — tabla `analitica_rachas`.
 *
 * 6 columnas, 5 obligatorias.
 * Clave primaria: `user_id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `user_id`: BIGINT  · PK · NOT NULL
 * - `total_dias_activos`: INTEGER  · NOT NULL
 * - `racha_actual`: INTEGER  · NOT NULL
 * - `mejor_racha`: INTEGER  · NOT NULL
 * - `ultimo_acceso`: DATE
 * - `fecha_actualizacion`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_rachas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaRachas.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaRachas extends Model {}

CabsaRachas.init({
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true },
  "total_dias_activos": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "racha_actual": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "mejor_racha": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "ultimo_acceso": { type: DataTypes.DATE, allowNull: true },
  "fecha_actualizacion": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaRachas',
  tableName: "analitica_rachas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
