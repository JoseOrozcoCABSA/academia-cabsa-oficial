/**
 * @file Modelo `SoaPermissions` — tabla `usuarios_permisos`.
 *
 * 7 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `code`: STRING(100)  · NOT NULL
 * - `name`: STRING(160)  · NOT NULL
 * - `module`: STRING(80)  · NOT NULL
 * - `description`: STRING(255)
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_permisos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaPermissions.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaPermissions extends Model {}

SoaPermissions.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "code": { type: DataTypes.STRING(100), allowNull: false },
  "name": { type: DataTypes.STRING(160), allowNull: false },
  "module": { type: DataTypes.STRING(80), allowNull: false },
  "description": { type: DataTypes.STRING(255), allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaPermissions',
  tableName: "usuarios_permisos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
