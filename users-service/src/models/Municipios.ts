/**
 * @file Modelo `Municipios` — tabla `usuarios_municipios`.
 *
 * 4 columnas, 3 obligatorias.
 * Clave primaria: `id_municipio`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id_municipio`: INTEGER  · PK · NOT NULL
 * - `clave_municipio`: CHAR(3)
 * - `nombre_municipio`: STRING(100)  · NOT NULL
 * - `id_estado`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_municipios`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Municipios.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Municipios extends Model {}

Municipios.init({
  "id_municipio": { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  "clave_municipio": { type: DataTypes.CHAR(3), allowNull: true },
  "nombre_municipio": { type: DataTypes.STRING(100), allowNull: false },
  "id_estado": { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize: database,
  modelName: 'Municipios',
  tableName: "usuarios_municipios",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
