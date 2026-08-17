/**
 * @file Modelo `JobBatches` — tabla `academia_lotes_trabajo`.
 *
 * 10 columnas, 7 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: STRING(255)  · PK · NOT NULL
 * - `name`: STRING(255)  · NOT NULL
 * - `total_jobs`: INTEGER  · NOT NULL
 * - `pending_jobs`: INTEGER  · NOT NULL
 * - `academia_trabajos_fallidos`: INTEGER  · NOT NULL
 * - `failed_job_ids`: TEXT("long")  · NOT NULL
 * - `options`: TEXT("medium")
 * - `cancelled_at`: INTEGER
 * - `created_at`: INTEGER  · NOT NULL
 * - `finished_at`: INTEGER
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_lotes_trabajo`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `JobBatches.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class JobBatches extends Model {}

JobBatches.init({
  "id": { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  "name": { type: DataTypes.STRING(255), allowNull: false },
  "total_jobs": { type: DataTypes.INTEGER, allowNull: false },
  "pending_jobs": { type: DataTypes.INTEGER, allowNull: false },
  "academia_trabajos_fallidos": { type: DataTypes.INTEGER, allowNull: false },
  "failed_job_ids": { type: DataTypes.TEXT("long"), allowNull: false },
  "options": { type: DataTypes.TEXT("medium"), allowNull: true },
  "cancelled_at": { type: DataTypes.INTEGER, allowNull: true },
  "created_at": { type: DataTypes.INTEGER, allowNull: false },
  "finished_at": { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize: database,
  modelName: 'JobBatches',
  tableName: "academia_lotes_trabajo",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
