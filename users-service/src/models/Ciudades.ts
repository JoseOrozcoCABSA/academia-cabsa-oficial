/**
 * @file Modelo `Ciudades` — tabla `usuarios_ciudades`.
 *
 * 2 columnas, 2 obligatorias.
 * Clave primaria: `id_ciudad`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id_ciudad`: INTEGER  · PK · NOT NULL
 * - `nombre_ciudad`: STRING(50)  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_ciudades`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Ciudades.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Ciudades extends Model {}

Ciudades.init({
  "id_ciudad": { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  "nombre_ciudad": { type: DataTypes.STRING(50), allowNull: false },
}, {
  sequelize: database,
  modelName: 'Ciudades',
  tableName: "usuarios_ciudades",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
