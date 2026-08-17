/**
 * @file Modelo `VistaControlDuplicadosUsuarios` — tabla `usuarios_vista_control_duplicados`.
 *
 * 9 columnas, 8 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `usuario`: STRING(190)  · NOT NULL
 * - `nombre_visible`: STRING(250)  · NOT NULL
 * - `correo`: STRING(190)  · NOT NULL
 * - `rfc`: STRING(20)  · NOT NULL
 * - `estado_cuenta`: ENUM("activo", "inactivo")  · NOT NULL
 * - `coincidencias_correo`: BIGINT  · NOT NULL
 * - `coincidencias_rfc`: BIGINT  · NOT NULL
 * - `motivo_duplicado`: STRING(33)
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_vista_control_duplicados`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `VistaControlDuplicadosUsuarios.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class VistaControlDuplicadosUsuarios extends Model {}

VistaControlDuplicadosUsuarios.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true },
  "usuario": { type: DataTypes.STRING(190), allowNull: false },
  "nombre_visible": { type: DataTypes.STRING(250), allowNull: false },
  "correo": { type: DataTypes.STRING(190), allowNull: false },
  "rfc": { type: DataTypes.STRING(20), allowNull: false },
  "estado_cuenta": { type: DataTypes.ENUM("activo", "inactivo"), allowNull: false },
  "coincidencias_correo": { type: DataTypes.BIGINT, allowNull: false },
  "coincidencias_rfc": { type: DataTypes.BIGINT, allowNull: false },
  "motivo_duplicado": { type: DataTypes.STRING(33), allowNull: true },
}, {
  sequelize: database,
  modelName: 'VistaControlDuplicadosUsuarios',
  tableName: "usuarios_vista_control_duplicados",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
