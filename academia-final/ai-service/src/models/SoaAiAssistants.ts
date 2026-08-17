/**
 * @file Modelo `SoaAiAssistants` — tabla `ia_asistentes`.
 *
 * 11 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `name`: STRING(120)  · NOT NULL
 * - `slug`: STRING(140)  · NOT NULL
 * - `description`: TEXT
 * - `provider`: STRING(60)  · NOT NULL
 * - `model`: STRING(120)  · NOT NULL
 * - `system_instructions`: TEXT("long")
 * - `temperature`: DECIMAL(3, 2)  · NOT NULL
 * - `is_active`: BOOLEAN  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `ia_asistentes`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaAiAssistants.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaAiAssistants extends Model {}

SoaAiAssistants.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "name": { type: DataTypes.STRING(120), allowNull: false },
  "slug": { type: DataTypes.STRING(140), allowNull: false },
  "description": { type: DataTypes.TEXT, allowNull: true },
  "provider": { type: DataTypes.STRING(60), allowNull: false },
  "model": { type: DataTypes.STRING(120), allowNull: false },
  "system_instructions": { type: DataTypes.TEXT("long"), allowNull: true },
  "temperature": { type: DataTypes.DECIMAL(3, 2), allowNull: false },
  "is_active": { type: DataTypes.BOOLEAN, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaAiAssistants',
  tableName: "ia_asistentes",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
