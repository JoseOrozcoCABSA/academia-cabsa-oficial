/**
 * @file Modelo `CabsaMailFiles` — tabla `notificaciones_archivos_correo`.
 *
 * 10 columnas, 4 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `token`: STRING(80)  · NOT NULL
 * - `path`: STRING(255)  · NOT NULL
 * - `original_name`: STRING(255)  · NOT NULL
 * - `mime_type`: STRING(120)
 * - `size_bytes`: BIGINT
 * - `uploaded_by`: BIGINT
 * - `expires_at`: DATE
 * - `created_at`: DATE
 * - `updated_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_archivos_correo`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaMailFiles.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaMailFiles extends Model {}

CabsaMailFiles.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "token": { type: DataTypes.STRING(80), allowNull: false },
  "path": { type: DataTypes.STRING(255), allowNull: false },
  "original_name": { type: DataTypes.STRING(255), allowNull: false },
  "mime_type": { type: DataTypes.STRING(120), allowNull: true },
  "size_bytes": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "uploaded_by": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "expires_at": { type: DataTypes.DATE, allowNull: true },
  "created_at": { type: DataTypes.DATE, allowNull: true },
  "updated_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaMailFiles',
  tableName: "notificaciones_archivos_correo",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
