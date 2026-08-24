/**
 * @file Modelo `SoaLearningActivityDays` — tabla `analitica_actividad_aprendizaje`.
 *
 * 8 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `user_id`: UUID  · NOT NULL
 * - `activity_date`: DATEONLY  · NOT NULL
 * - `capsule_completions`: INTEGER  · NOT NULL
 * - `lesson_completions`: INTEGER  · NOT NULL
 * - `last_activity_at`: DATE  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_actividad_aprendizaje`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaLearningActivityDays.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaLearningActivityDays extends Model {}

SoaLearningActivityDays.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  activity_date: { type: DataTypes.DATEONLY, allowNull: false },
  capsule_completions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  lesson_completions: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  last_activity_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaLearningActivityDays',
  tableName: 'analitica_actividad_aprendizaje',
  timestamps: false,
  freezeTableName: true,
});
