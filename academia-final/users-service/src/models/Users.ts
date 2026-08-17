/**
 * @file Modelo `Users` — tabla `usuarios_cuentas_legacy`.
 *
 * 16 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `name`: STRING(255)  · NOT NULL
 * - `email`: STRING(255)  · NOT NULL
 * - `email_verified_at`: DATE
 * - `password`: STRING(255)  · NOT NULL
 * - `fomaqro_member`: STRING(3)  · NOT NULL
 * - `rfc`: STRING(13)
 * - `region_id`: STRING(20)
 * - `region_name`: STRING(190)
 * - `municipio_id`: STRING(10)
 * - `municipio`: STRING(190)
 * - `beca_code`: STRING(80)
 * - `beca_status`: STRING(30)  · NOT NULL
 * - `remember_token`: STRING(100)
 * - `created_at`: DATE
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_cuentas_legacy`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Users.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Users extends Model {}

Users.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "name": { type: DataTypes.STRING(255), allowNull: false },
  "email": { type: DataTypes.STRING(255), allowNull: false },
  "email_verified_at": { type: DataTypes.DATE, allowNull: true },
  "password": { type: DataTypes.STRING(255), allowNull: false },
  "fomaqro_member": { type: DataTypes.STRING(3), allowNull: false },
  "rfc": { type: DataTypes.STRING(13), allowNull: true },
  "region_id": { type: DataTypes.STRING(20), allowNull: true },
  "region_name": { type: DataTypes.STRING(190), allowNull: true },
  "municipio_id": { type: DataTypes.STRING(10), allowNull: true },
  "municipio": { type: DataTypes.STRING(190), allowNull: true },
  "beca_code": { type: DataTypes.STRING(80), allowNull: true },
  "beca_status": { type: DataTypes.STRING(30), allowNull: false },
  "remember_token": { type: DataTypes.STRING(100), allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: true },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'Users',
  tableName: "usuarios_cuentas_legacy",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
