/**
 * @file Modelo `SoaRagDocuments` — tabla `ia_documentos_rag`.
 *
 * 13 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `knowledge_base_id`: CHAR(36)  · NOT NULL
 * - `content_item_id`: CHAR(36)
 * - `title`: STRING(255)  · NOT NULL
 * - `source_url`: STRING(1000)
 * - `checksum`: STRING(128)
 * - `status`: ENUM("PENDING", "INDEXING", "INDEXED", "FAILED")  · NOT NULL
 * - `qdrant_point_ids`: JSON
 * - `chunk_count`: INTEGER  · NOT NULL
 * - `indexed_at`: DATE
 * - `error_message`: TEXT
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_documentos_rag`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaRagDocuments.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaRagDocuments extends Model {}

SoaRagDocuments.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "knowledge_base_id": { type: DataTypes.CHAR(36), allowNull: false },
  "content_item_id": { type: DataTypes.CHAR(36), allowNull: true },
  "title": { type: DataTypes.STRING(255), allowNull: false },
  "source_url": { type: DataTypes.STRING(1000), allowNull: true },
  "checksum": { type: DataTypes.STRING(128), allowNull: true },
  "status": { type: DataTypes.ENUM("PENDING", "INDEXING", "INDEXED", "FAILED"), allowNull: false },
  "qdrant_point_ids": { type: DataTypes.JSON, allowNull: true },
  "chunk_count": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "indexed_at": { type: DataTypes.DATE, allowNull: true },
  "error_message": { type: DataTypes.TEXT, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaRagDocuments',
  tableName: "ia_documentos_rag",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
