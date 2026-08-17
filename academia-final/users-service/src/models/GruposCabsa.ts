/**
 * @file Modelo `GruposCabsa` — tabla `usuarios_grupos`.
 *
 * 9 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `nombre`: STRING(190)  · NOT NULL
 * - `descripcion`: TEXT
 * - `clave_estado`: CHAR(2)  · NOT NULL
 * - `estado`: STRING(190)  · NOT NULL
 * - `clave_municipio`: CHAR(3)  · NOT NULL
 * - `municipio`: STRING(190)  · NOT NULL
 * - `creado_en`: DATE  · NOT NULL
 * - `actualizado_en`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_grupos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `GruposCabsa.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class GruposCabsa extends Model {}

GruposCabsa.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "nombre": { type: DataTypes.STRING(190), allowNull: false },
  "descripcion": { type: DataTypes.TEXT, allowNull: true },
  "clave_estado": { type: DataTypes.CHAR(2), allowNull: false },
  "estado": { type: DataTypes.STRING(190), allowNull: false },
  "clave_municipio": { type: DataTypes.CHAR(3), allowNull: false },
  "municipio": { type: DataTypes.STRING(190), allowNull: false },
  "creado_en": { type: DataTypes.DATE, allowNull: false },
  "actualizado_en": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'GruposCabsa',
  tableName: "usuarios_grupos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
