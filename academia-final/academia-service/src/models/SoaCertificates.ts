/**
 * @file Modelo `SoaCertificates` — tabla `academia_certificados`.
 *
 * 11 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: CHAR(36)  · PK · NOT NULL
 * - `user_id`: CHAR(36)  · NOT NULL
 * - `course_id`: BIGINT  · NOT NULL
 * - `enrollment_id`: CHAR(36)  · NOT NULL
 * - `folio`: STRING(80)  · NOT NULL
 * - `verification_code`: STRING(100)  · NOT NULL
 * - `issued_at`: DATE  · NOT NULL
 * - `file_url`: STRING(500)
 * - `revoked_at`: DATE
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_certificados`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaCertificates.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaCertificates extends Model {}

SoaCertificates.init({
  "id": { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  "user_id": { type: DataTypes.CHAR(36), allowNull: false },
  "course_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "enrollment_id": { type: DataTypes.CHAR(36), allowNull: false },
  "folio": { type: DataTypes.STRING(80), allowNull: false },
  "verification_code": { type: DataTypes.STRING(100), allowNull: false },
  "issued_at": { type: DataTypes.DATE, allowNull: false },
  "file_url": { type: DataTypes.STRING(500), allowNull: true },
  "revoked_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaCertificates',
  tableName: "academia_certificados",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
