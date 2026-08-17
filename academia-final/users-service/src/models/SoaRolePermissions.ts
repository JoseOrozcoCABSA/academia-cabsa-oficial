/**
 * @file Modelo `SoaRolePermissions` — tabla `usuarios_roles_permisos`.
 *
 * 4 columnas, 4 obligatorias.
 * Clave primaria: `role_id`, `permission_id` (compuesta: usar la ruta `/record`, no `/:id`).
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `role_id`: CHAR(36)  · PK · NOT NULL
 * - `permission_id`: CHAR(36)  · PK · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_roles_permisos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaRolePermissions.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaRolePermissions extends Model {}

SoaRolePermissions.init({
  "role_id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "permission_id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaRolePermissions',
  tableName: "usuarios_roles_permisos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
