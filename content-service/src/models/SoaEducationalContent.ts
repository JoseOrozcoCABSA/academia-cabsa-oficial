/**
 * @file Modelo `SoaEducationalContent` — tabla `contenido_material_educativo`.
 *
 * 16 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `slug`: STRING(180)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `description`: TEXT
 * - `content_type`: ENUM("MATERIAL", "CAPSULE", "VIDEO", "DOCUMENT", "AUDIO", "LINK")  · NOT NULL
 * - `status`: ENUM("DRAFT", "PUBLISHED", "ARCHIVED")  · NOT NULL
 * - `author_user_id`: CHAR(36)
 * - `category`: STRING(120)
 * - `language`: STRING(10)  · NOT NULL
 * - `duration_seconds`: INTEGER
 * - `body`: TEXT("long")
 * - `cover_url`: STRING(500)
 * - `published_at`: DATE
 * - `legacy_capsule_id`: BIGINT
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `contenido_material_educativo`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaEducationalContent.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaEducationalContent extends Model {}

SoaEducationalContent.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "slug": { type: DataTypes.STRING(180), allowNull: false },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "description": { type: DataTypes.TEXT, allowNull: true },
  "content_type": { type: DataTypes.ENUM("MATERIAL", "CAPSULE", "VIDEO", "DOCUMENT", "AUDIO", "LINK"), allowNull: false },
  "status": { type: DataTypes.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"), allowNull: false },
  "author_user_id": { type: DataTypes.CHAR(36), allowNull: true },
  "category": { type: DataTypes.STRING(120), allowNull: true },
  "language": { type: DataTypes.STRING(10), allowNull: false },
  "duration_seconds": { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  "body": { type: DataTypes.TEXT("long"), allowNull: true },
  "cover_url": { type: DataTypes.STRING(500), allowNull: true },
  "published_at": { type: DataTypes.DATE, allowNull: true },
  "legacy_capsule_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaEducationalContent',
  tableName: "contenido_material_educativo",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
