/**
 * @file Modelo `SoaPromptTemplates` — tabla `ia_plantillas_prompts`.
 *
 * 10 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `assistant_id`: CHAR(36)
 * - `name`: STRING(160)  · NOT NULL
 * - `purpose`: STRING(255)
 * - `template`: TEXT("long")  · NOT NULL
 * - `variables`: JSON
 * - `version`: INTEGER  · NOT NULL
 * - `is_active`: BOOLEAN  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_plantillas_prompts`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaPromptTemplates.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaPromptTemplates extends Model {}

SoaPromptTemplates.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "assistant_id": { type: DataTypes.CHAR(36), allowNull: true },
  "name": { type: DataTypes.STRING(160), allowNull: false },
  "purpose": { type: DataTypes.STRING(255), allowNull: true },
  "template": { type: DataTypes.TEXT("long"), allowNull: false },
  "variables": { type: DataTypes.JSON, allowNull: true },
  "version": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "is_active": { type: DataTypes.BOOLEAN, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaPromptTemplates',
  tableName: "ia_plantillas_prompts",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
