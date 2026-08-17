/**
 * @file Modelo `CabsaForumTopics` — tabla `academia_foro_temas`.
 *
 * 10 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `forum_id`: BIGINT  · NOT NULL
 * - `author_id`: STRING(64)
 * - `author_name`: STRING(255)
 * - `slug`: STRING(190)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `content`: TEXT('long')  · NOT NULL
 * - `status`: STRING(20)  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_foro_temas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaForumTopics.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaForumTopics extends Model {}

CabsaForumTopics.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  forum_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  author_id: { type: DataTypes.STRING(64), allowNull: true },
  author_name: { type: DataTypes.STRING(255), allowNull: true },
  slug: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT('long'), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'published' },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaForumTopics',
  tableName: 'academia_foro_temas',
  timestamps: false,
  freezeTableName: true,
});
