/**
 * @file Modelo `CodigosPostales` — tabla `usuarios_codigos_postales`.
 *
 * 3 columnas, 3 obligatorias.
 * Clave primaria: `id_codigo_postal`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id_codigo_postal`: INTEGER  · PK · NOT NULL
 * - `codigo_postal`: INTEGER  · NOT NULL
 * - `id_municipio`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_codigos_postales`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CodigosPostales.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CodigosPostales extends Model {}

CodigosPostales.init({
  "id_codigo_postal": { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  "codigo_postal": { type: DataTypes.INTEGER, allowNull: false },
  "id_municipio": { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CodigosPostales',
  tableName: "usuarios_codigos_postales",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
