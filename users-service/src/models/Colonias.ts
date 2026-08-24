/**
 * @file Modelo `Colonias` — tabla `usuarios_colonias`.
 *
 * 7 columnas, 4 obligatorias.
 * Clave primaria: `id_colonia`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id_colonia`: INTEGER  · PK · NOT NULL
 * - `nombre_colonia`: STRING(60)  · NOT NULL
 * - `id_asentamiento`: STRING(10)
 * - `tipo_asentamiento`: STRING(120)
 * - `zona`: STRING(80)
 * - `id_ciudad`: INTEGER  · NOT NULL
 * - `id_codigo_postal`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_colonias`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Colonias.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Colonias extends Model {}

Colonias.init({
  "id_colonia": { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  "nombre_colonia": { type: DataTypes.STRING(60), allowNull: false },
  "id_asentamiento": { type: DataTypes.STRING(10), allowNull: true },
  "tipo_asentamiento": { type: DataTypes.STRING(120), allowNull: true },
  "zona": { type: DataTypes.STRING(80), allowNull: true },
  "id_ciudad": { type: DataTypes.INTEGER, allowNull: false },
  "id_codigo_postal": { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize: database,
  modelName: 'Colonias',
  tableName: "usuarios_colonias",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
