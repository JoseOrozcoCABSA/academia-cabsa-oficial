/**
 * @file Modelo `Migrations` — tabla `academia_migraciones`.
 *
 * 3 columnas, 3 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: INTEGER  · PK · NOT NULL
 * - `migration`: STRING(255)  · NOT NULL
 * - `batch`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_migraciones`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Migrations.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Migrations extends Model {}

Migrations.init({
  "id": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "migration": { type: DataTypes.STRING(255), allowNull: false },
  "batch": { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize: database,
  modelName: 'Migrations',
  tableName: "academia_migraciones",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
