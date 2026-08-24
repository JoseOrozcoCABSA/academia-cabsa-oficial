/**
 * @file Modelo `MembresiaUsuario` — tabla `usuarios_membresias`.
 *
 * 15 columnas, 14 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `user_id`: BIGINT  · NOT NULL
 * - `membership_id`: INTEGER  · NOT NULL
 * - `code_id`: BIGINT  · NOT NULL
 * - `initial_payment`: DECIMAL(18, 8)  · NOT NULL
 * - `billing_amount`: DECIMAL(18, 8)  · NOT NULL
 * - `cycle_number`: INTEGER  · NOT NULL
 * - `cycle_period`: STRING(10)  · NOT NULL
 * - `billing_limit`: INTEGER  · NOT NULL
 * - `trial_amount`: DECIMAL(18, 8)  · NOT NULL
 * - `trial_limit`: INTEGER  · NOT NULL
 * - `status`: STRING(20)  · NOT NULL
 * - `startdate`: DATE  · NOT NULL
 * - `enddate`: DATE
 * - `modified`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_membresias`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `MembresiaUsuario.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class MembresiaUsuario extends Model {}

MembresiaUsuario.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  membership_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  code_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  initial_payment: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
  billing_amount: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
  cycle_number: { type: DataTypes.INTEGER, allowNull: false },
  cycle_period: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'Month' },
  billing_limit: { type: DataTypes.INTEGER, allowNull: false },
  trial_amount: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
  trial_limit: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  startdate: { type: DataTypes.DATE, allowNull: false },
  enddate: { type: DataTypes.DATE, allowNull: true },
  modified: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'MembresiaUsuario',
  tableName: 'usuarios_membresias',
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
