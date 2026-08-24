/**
 * @file Modelo `CabsaForums` — tabla `academia_foros`.
 *
 * 9 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `slug`: STRING(160)  · NOT NULL
 * - `title`: STRING(255)  · NOT NULL
 * - `description`: TEXT  · NOT NULL
 * - `icon`: STRING(16)
 * - `topics_count`: INTEGER  · NOT NULL
 * - `status`: STRING(20)  · NOT NULL
 * - `created_at`: DATE
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_foros`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaForums.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaForums extends Model {}

CabsaForums.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  icon: { type: DataTypes.STRING(16), allowNull: true },
  topics_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'published' },
  created_at: { type: DataTypes.DATE, allowNull: true },
  updated_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaForums',
  tableName: 'academia_foros',
  timestamps: false,
  freezeTableName: true,
});
