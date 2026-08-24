/**
 * @file Modelo `Estados` — tabla `usuarios_estados`.
 *
 * 3 columnas, 2 obligatorias.
 * Clave primaria: `id_estado`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id_estado`: INTEGER  · PK · NOT NULL
 * - `clave_estado`: CHAR(2)
 * - `nombre_estado`: STRING(100)  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_estados`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Estados.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Estados extends Model {}

Estados.init({
  "id_estado": { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  "clave_estado": { type: DataTypes.CHAR(2), allowNull: true },
  "nombre_estado": { type: DataTypes.STRING(100), allowNull: false },
}, {
  sequelize: database,
  modelName: 'Estados',
  tableName: "usuarios_estados",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
