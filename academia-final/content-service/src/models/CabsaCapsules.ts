/**
 * @file Modelo `CabsaCapsules` — tabla `contenido_capsulas`.
 *
 * 13 columnas, 7 obligatorias.
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
 * - `body`: LONGTEXT
 * - `category`: STRING(120)  · NOT NULL
 * - `image`: STRING(1000)
 * - `image_position`: ENUM('top','bottom') · NOT NULL
 * - `external_url`: STRING(1000)
 * - `is_featured`: BOOLEAN  · NOT NULL
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
 * Modelo Sequelize de `contenido_capsulas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaCapsules.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaCapsules extends Model {}

CabsaCapsules.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "slug": { type: DataTypes.STRING(160), allowNull: false },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "summary": { type: DataTypes.TEXT, allowNull: false },
  "body": { type: DataTypes.TEXT('long'), allowNull: true },
  "category": { type: DataTypes.STRING(120), allowNull: false },
  "image": { type: DataTypes.STRING(1000), allowNull: true },
  "image_position": { type: DataTypes.ENUM('top', 'bottom'), allowNull: false, defaultValue: 'top' },
  "external_url": { type: DataTypes.STRING(1000), allowNull: true },
  "is_featured": { type: DataTypes.BOOLEAN, allowNull: false },
  "status": { type: DataTypes.STRING(20), allowNull: false },
  "published_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: true },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaCapsules',
  tableName: "contenido_capsulas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
