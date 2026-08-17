/**
 * @file Modelo `UsuariosGruposCabsa` — tabla `usuarios_miembros_grupos`.
 *
 * 4 columnas, 4 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `grupo_id`: BIGINT  · NOT NULL
 * - `usuario_oficial_id`: BIGINT  · NOT NULL
 * - `agregado_en`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_miembros_grupos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `UsuariosGruposCabsa.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class UsuariosGruposCabsa extends Model {}

UsuariosGruposCabsa.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "grupo_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "usuario_oficial_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "agregado_en": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'UsuariosGruposCabsa',
  tableName: "usuarios_miembros_grupos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
