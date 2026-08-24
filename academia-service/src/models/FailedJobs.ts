/**
 * @file Modelo `FailedJobs` — tabla `academia_trabajos_fallidos`.
 *
 * 7 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `uuid`: STRING(255)  · NOT NULL
 * - `connection`: STRING(255)  · NOT NULL
 * - `queue`: STRING(255)  · NOT NULL
 * - `payload`: TEXT("long")  · NOT NULL
 * - `exception`: TEXT("long")  · NOT NULL
 * - `failed_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_trabajos_fallidos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `FailedJobs.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class FailedJobs extends Model {}

FailedJobs.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "uuid": { type: DataTypes.STRING(255), allowNull: false },
  "connection": { type: DataTypes.STRING(255), allowNull: false },
  "queue": { type: DataTypes.STRING(255), allowNull: false },
  "payload": { type: DataTypes.TEXT("long"), allowNull: false },
  "exception": { type: DataTypes.TEXT("long"), allowNull: false },
  "failed_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'FailedJobs',
  tableName: "academia_trabajos_fallidos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
