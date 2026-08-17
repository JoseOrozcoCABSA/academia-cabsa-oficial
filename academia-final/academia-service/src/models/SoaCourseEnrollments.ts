/**
 * @file Modelo `SoaCourseEnrollments` — tabla `academia_inscripciones`.
 *
 * 9 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `user_id`: CHAR(36)  · NOT NULL
 * - `course_id`: BIGINT  · NOT NULL
 * - `status`: ENUM("ACTIVE", "COMPLETED", "SUSPENDED", "CANCELLED")  · NOT NULL
 * - `enrolled_at`: DATE  · NOT NULL
 * - `completed_at`: DATE
 * - `progress_percent`: DECIMAL(5, 2)  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_inscripciones`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaCourseEnrollments.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaCourseEnrollments extends Model {}

SoaCourseEnrollments.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.CHAR(36), allowNull: false },
  "course_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "status": { type: DataTypes.ENUM("ACTIVE", "COMPLETED", "SUSPENDED", "CANCELLED"), allowNull: false },
  "enrolled_at": { type: DataTypes.DATE, allowNull: false },
  "completed_at": { type: DataTypes.DATE, allowNull: true },
  "progress_percent": { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaCourseEnrollments',
  tableName: "academia_inscripciones",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
