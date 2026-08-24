/**
 * @file Modelo `SoaRoles` — tabla `usuarios_roles`.
 *
 * 7 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `code`: STRING(60)  · NOT NULL
 * - `name`: STRING(120)  · NOT NULL
 * - `description`: STRING(255)
 * - `is_system`: BOOLEAN  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_roles`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaRoles.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaRoles extends Model {}

SoaRoles.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "code": { type: DataTypes.STRING(60), allowNull: false },
  "name": { type: DataTypes.STRING(120), allowNull: false },
  "description": { type: DataTypes.STRING(255), allowNull: true },
  "is_system": { type: DataTypes.BOOLEAN, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaRoles',
  tableName: "usuarios_roles",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
