/**
 * @file Modelo `CabsaAsistentesTutores` — tabla `ia_asistentes_tutores`.
 *
 * 9 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `slug`: STRING(120)  · NOT NULL
 * - `numero`: STRING(30)  · NOT NULL
 * - `gpt_url`: TEXT
 * - `gem_url`: TEXT
 * - `media_id`: BIGINT
 * - `source_option`: STRING(80)  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_asistentes_tutores`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaAsistentesTutores.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaAsistentesTutores extends Model {}

CabsaAsistentesTutores.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "slug": { type: DataTypes.STRING(120), allowNull: false },
  "numero": { type: DataTypes.STRING(30), allowNull: false },
  "gpt_url": { type: DataTypes.TEXT, allowNull: true },
  "gem_url": { type: DataTypes.TEXT, allowNull: true },
  "media_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "source_option": { type: DataTypes.STRING(80), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaAsistentesTutores',
  tableName: "ia_asistentes_tutores",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
