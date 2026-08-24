/**
 * @file Modelo `CabsaBecaCodeEmail` — tabla `usuarios_codigos_beca_email`.
 *
 * 5 columnas, 4 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `code`: STRING(191)  · NOT NULL
 * - `allowed_email`: STRING(191)  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_codigos_beca_email`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaBecaCodeEmail.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaBecaCodeEmail extends Model {}

CabsaBecaCodeEmail.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "code": { type: DataTypes.STRING(191), allowNull: false },
  "allowed_email": { type: DataTypes.STRING(191), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
  "legacy_code_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "nivel_membresia_id": { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  "vigente_desde": { type: DataTypes.DATEONLY, allowNull: true },
  "vigente_hasta": { type: DataTypes.DATEONLY, allowNull: true },
  "max_usos": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  "usos_historicos": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  "usado_por_user_id": { type: DataTypes.CHAR(36), allowNull: true },
  "usado_en": { type: DataTypes.DATE, allowNull: true },
  "estado": { type: DataTypes.ENUM('ACTIVE', 'REVOKED'), allowNull: false, defaultValue: 'ACTIVE' },
  "lote": { type: DataTypes.STRING(120), allowNull: true },
  "notas": { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaBecaCodeEmail',
  tableName: "usuarios_codigos_beca_email",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
