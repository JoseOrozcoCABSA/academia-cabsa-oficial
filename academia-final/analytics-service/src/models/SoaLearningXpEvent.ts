/**
 * @file Modelo `SoaLearningXpEvent` — tabla `analitica_eventos_xp`.
 *
 * 10 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: UUID  · PK · NOT NULL
 * - `user_id`: UUID  · NOT NULL
 * - `event_type`: ENUM('LESSON_COMPLETED', 'COURSE_COMPLETED')  · NOT NULL
 * - `source_id`: STRING(80)  · NOT NULL
 * - `course_id`: BIGINT  · NOT NULL
 * - `lesson_id`: BIGINT
 * - `points`: INTEGER  · NOT NULL
 * - `description`: STRING(255)  · NOT NULL
 * - `earned_at`: DATE  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_eventos_xp`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaLearningXpEvent.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaLearningXpEvent extends Model {}

SoaLearningXpEvent.init({
  id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  event_type: {
    type: DataTypes.ENUM('LESSON_COMPLETED', 'COURSE_COMPLETED'),
    allowNull: false,
  },
  source_id: { type: DataTypes.STRING(80), allowNull: false },
  course_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  lesson_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  earned_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaLearningXpEvent',
  tableName: 'analitica_eventos_xp',
  timestamps: false,
  freezeTableName: true,
});
