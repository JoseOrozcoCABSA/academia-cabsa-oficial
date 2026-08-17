/**
 * @file Modelo `SoaCapsuleProgress` — tabla `analitica_progreso_capsulas`.
 *
 * 8 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: UUID  · PK · NOT NULL
 * - `user_id`: UUID  · NOT NULL
 * - `capsule_id`: BIGINT  · NOT NULL
 * - `semaphore_status`: ENUM('GREEN', 'YELLOW', 'RED')  · NOT NULL
 * - `progress_percent`: DECIMAL(5, 2)  · NOT NULL
 * - `completed_at`: DATE  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_progreso_capsulas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `SoaCapsuleProgress.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class SoaCapsuleProgress extends Model {}

SoaCapsuleProgress.init({
  id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  capsule_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  semaphore_status: {
    type: DataTypes.ENUM('GREEN', 'YELLOW', 'RED'),
    allowNull: false,
  },
  progress_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100 },
  completed_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'SoaCapsuleProgress',
  tableName: 'analitica_progreso_capsulas',
  timestamps: false,
  freezeTableName: true,
});
