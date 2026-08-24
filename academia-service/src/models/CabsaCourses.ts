/**
 * @file Modelo `CabsaCourses` — tabla `academia_cursos`.
 *
 * 12 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `slug`: STRING(160)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `summary`: TEXT  · NOT NULL
 * - `description`: TEXT
 * - `image`: STRING(255)
 * - `category`: STRING(120)
 * - `lessons_count`: INTEGER  · NOT NULL
 * - `status`: STRING(20)  · NOT NULL
 * - `published_at`: DATE
 * - `created_at`: DATE
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_cursos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaCourses.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaCourses extends Model {}

CabsaCourses.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "slug": { type: DataTypes.STRING(160), allowNull: false },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "summary": { type: DataTypes.TEXT, allowNull: false },
  "description": { type: DataTypes.TEXT, allowNull: true },
  "image": { type: DataTypes.STRING(255), allowNull: true },
  "category": { type: DataTypes.STRING(120), allowNull: true },
  "lessons_count": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  "reading_timer_enabled": { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  "status": { type: DataTypes.STRING(20), allowNull: false },
  "published_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: true },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaCourses',
  tableName: "academia_cursos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
