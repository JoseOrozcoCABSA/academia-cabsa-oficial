/**
 * @file Modelo `CabsaForumReplies` — tabla `academia_foro_respuestas`.
 *
 * 9 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `topic_id`: BIGINT  · NOT NULL
 * - `forum_id`: BIGINT  · NOT NULL
 * - `author_id`: STRING(64)
 * - `author_name`: STRING(255)
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
 * Modelo Sequelize de `academia_foro_respuestas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaForumReplies.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaForumReplies extends Model {}

CabsaForumReplies.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  topic_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  forum_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  author_id: { type: DataTypes.STRING(64), allowNull: true },
  author_name: { type: DataTypes.STRING(255), allowNull: true },
  content: { type: DataTypes.TEXT('long'), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'published' },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaForumReplies',
  tableName: 'academia_foro_respuestas',
  timestamps: false,
  freezeTableName: true,
});
