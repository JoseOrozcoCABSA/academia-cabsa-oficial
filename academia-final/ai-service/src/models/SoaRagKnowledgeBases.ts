/**
 * @file Modelo `SoaRagKnowledgeBases` — tabla `ia_bases_conocimiento_rag`.
 *
 * 10 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `name`: STRING(160)  · NOT NULL
 * - `description`: TEXT
 * - `qdrant_url`: STRING(500)  · NOT NULL
 * - `qdrant_collection`: STRING(160)  · NOT NULL
 * - `embedding_model`: STRING(160)  · NOT NULL
 * - `vector_size`: INTEGER  · NOT NULL
 * - `is_active`: BOOLEAN  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_bases_conocimiento_rag`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaRagKnowledgeBases.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaRagKnowledgeBases extends Model {}

SoaRagKnowledgeBases.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "name": { type: DataTypes.STRING(160), allowNull: false },
  "description": { type: DataTypes.TEXT, allowNull: true },
  "qdrant_url": { type: DataTypes.STRING(500), allowNull: false },
  "qdrant_collection": { type: DataTypes.STRING(160), allowNull: false },
  "embedding_model": { type: DataTypes.STRING(160), allowNull: false },
  "vector_size": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "is_active": { type: DataTypes.BOOLEAN, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaRagKnowledgeBases',
  tableName: "ia_bases_conocimiento_rag",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
