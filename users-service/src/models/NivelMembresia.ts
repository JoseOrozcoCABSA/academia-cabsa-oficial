/**
 * @file Modelo `NivelMembresia` — tabla `usuarios_niveles_membresia`.
 *
 * 14 columnas, 13 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: INTEGER  · PK · NOT NULL
 * - `name`: STRING(255)  · NOT NULL
 * - `description`: TEXT('long')  · NOT NULL
 * - `confirmation`: TEXT('long')  · NOT NULL
 * - `initial_payment`: DECIMAL(18, 8)  · NOT NULL
 * - `billing_amount`: DECIMAL(18, 8)  · NOT NULL
 * - `cycle_number`: INTEGER  · NOT NULL
 * - `cycle_period`: STRING(10)
 * - `billing_limit`: INTEGER  · NOT NULL
 * - `trial_amount`: DECIMAL(18, 8)  · NOT NULL
 * - `trial_limit`: INTEGER  · NOT NULL
 * - `allow_signups`: TINYINT  · NOT NULL
 * - `expiration_number`: INTEGER  · NOT NULL
 * - `expiration_period`: STRING(10)  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_niveles_membresia`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `NivelMembresia.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class NivelMembresia extends Model {}

NivelMembresia.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT('long'), allowNull: false },
  confirmation: { type: DataTypes.TEXT('long'), allowNull: false },
  initial_payment: { type: DataTypes.DECIMAL(18, 8), allowNull: false, defaultValue: 0 },
  billing_amount: { type: DataTypes.DECIMAL(18, 8), allowNull: false, defaultValue: 0 },
  cycle_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  cycle_period: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'Month' },
  billing_limit: { type: DataTypes.INTEGER, allowNull: false },
  trial_amount: { type: DataTypes.DECIMAL(18, 8), allowNull: false, defaultValue: 0 },
  trial_limit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  allow_signups: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  expiration_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  expiration_period: { type: DataTypes.STRING(10), allowNull: false },
}, {
  sequelize: database,
  modelName: 'NivelMembresia',
  tableName: 'usuarios_niveles_membresia',
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
