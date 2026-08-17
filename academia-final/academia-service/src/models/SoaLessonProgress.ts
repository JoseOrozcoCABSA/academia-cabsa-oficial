/**
 * @file Modelo `SoaLessonProgress` — tabla `academia_progreso_lecciones`.
 *
 * 10 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `enrollment_id`: CHAR(36)  · NOT NULL
 * - `lesson_id`: BIGINT  · NOT NULL
 * - `status`: ENUM("NOT_STARTED", "IN_PROGRESS", "COMPLETED")  · NOT NULL
 * - `progress_percent`: DECIMAL(5, 2)  · NOT NULL
 * - `last_position_seconds`: INTEGER  · NOT NULL
 * - `started_at`: DATE
 * - `completed_at`: DATE
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_progreso_lecciones`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaLessonProgress.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaLessonProgress extends Model {}

SoaLessonProgress.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "enrollment_id": { type: DataTypes.CHAR(36), allowNull: false },
  "lesson_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "status": { type: DataTypes.ENUM("NOT_STARTED", "IN_PROGRESS", "COMPLETED"), allowNull: false },
  "progress_percent": { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  "last_position_seconds": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "started_at": { type: DataTypes.DATE, allowNull: true },
  "completed_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaLessonProgress',
  tableName: "academia_progreso_lecciones",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
