/**
 * @file Modelo `SoaContentAssets` — tabla `contenido_recursos`.
 *
 * 11 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `content_id`: CHAR(36)  · NOT NULL
 * - `asset_type`: ENUM("VIDEO", "DOCUMENT", "IMAGE", "AUDIO", "SUBTITLE", "ATTACHMENT")  · NOT NULL
 * - `name`: STRING(255)  · NOT NULL
 * - `url`: STRING(1000)  · NOT NULL
 * - `mime_type`: STRING(120)
 * - `size_bytes`: BIGINT
 * - `sort_order`: INTEGER  · NOT NULL
 * - `metadata`: JSON
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `contenido_recursos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaContentAssets.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaContentAssets extends Model {}

SoaContentAssets.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "content_id": { type: DataTypes.CHAR(36), allowNull: false },
  "asset_type": { type: DataTypes.ENUM("VIDEO", "DOCUMENT", "IMAGE", "AUDIO", "SUBTITLE", "ATTACHMENT"), allowNull: false },
  "name": { type: DataTypes.STRING(255), allowNull: false },
  "url": { type: DataTypes.STRING(1000), allowNull: false },
  "mime_type": { type: DataTypes.STRING(120), allowNull: true },
  "size_bytes": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "sort_order": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "metadata": { type: DataTypes.JSON, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaContentAssets',
  tableName: "contenido_recursos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
