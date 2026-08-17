/**
 * @file Modelo `SoaUserRoles` — tabla `usuarios_asignaciones_roles`.
 *
 * 5 columnas, 4 obligatorias.
 * Clave primaria: `user_id`, `role_id` (compuesta: usar la ruta `/record`, no `/:id`).
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `user_id`: CHAR(36)  · PK · NOT NULL
 * - `role_id`: CHAR(36)  · PK · NOT NULL
 * - `assigned_by`: CHAR(36)
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_asignaciones_roles`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaUserRoles.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaUserRoles extends Model {}

SoaUserRoles.init({
  "user_id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "role_id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "assigned_by": { type: DataTypes.CHAR(36), allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaUserRoles',
  tableName: "usuarios_asignaciones_roles",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
