/**
 * @file Modelo `CabsaCourseLessons` — tabla `academia_lecciones`.
 *
 * 10 columnas, 4 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `course_id`: BIGINT  · NOT NULL
 * - `number`: INTEGER  · NOT NULL
 * - `slug`: STRING(160)
 * - `title`: STRING(255)  · NOT NULL
 * - `module`: STRING(255)
 * - `summary`: TEXT
 * - `content`: TEXT('long')
 * - `created_at`: DATE
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_lecciones`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaCourseLessons.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaCourseLessons extends Model {}

CabsaCourseLessons.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "course_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "number": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "slug": { type: DataTypes.STRING(160), allowNull: true },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "module": { type: DataTypes.STRING(255), allowNull: true },
  "lesson_type": { type: DataTypes.ENUM('CONTENT', 'EXAM', 'PRACTICE', 'RESOURCE'), allowNull: false, defaultValue: 'CONTENT' },
  "minimum_reading_seconds": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 300 },
  "summary": { type: DataTypes.TEXT, allowNull: true },
  "content": { type: DataTypes.TEXT('long'), allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: true },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaCourseLessons',
  tableName: "academia_lecciones",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
