/**
 * @file Modelo `SoaUsers` — tabla `usuarios_cuentas`.
 *
 * 14 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `legacy_official_user_id`: BIGINT
 * - `email`: STRING(190)  · NOT NULL
 * - `username`: STRING(100)  · NOT NULL
 * - `password_hash`: STRING(255)  · NOT NULL
 * - `first_name`: STRING(120)
 * - `last_name`: STRING(160)
 * - `display_name`: STRING(255)  · NOT NULL
 * - `phone`: STRING(30)
 * - `status`: ENUM("PENDING", "ACTIVE", "SUSPENDED", "DISABLED")  · NOT NULL
 * - `email_verified_at`: DATE
 * - `last_login_at`: DATE
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_cuentas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaUsers.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaUsers extends Model {}

SoaUsers.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "legacy_official_user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "legacy_wp_user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "email": { type: DataTypes.STRING(190), allowNull: false },
  "username": { type: DataTypes.STRING(100), allowNull: false },
  "password_hash": { type: DataTypes.STRING(255), allowNull: false },
  "first_name": { type: DataTypes.STRING(120), allowNull: true },
  "last_name": { type: DataTypes.STRING(160), allowNull: true },
  "display_name": { type: DataTypes.STRING(255), allowNull: false },
  "phone": { type: DataTypes.STRING(30), allowNull: true },
  "status": { type: DataTypes.ENUM("PENDING", "ACTIVE", "SUSPENDED", "DISABLED"), allowNull: false },
  "email_verified_at": { type: DataTypes.DATE, allowNull: true },
  "last_login_at": { type: DataTypes.DATE, allowNull: true },
  "scholarship_cancelled_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaUsers',
  tableName: "usuarios_cuentas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
