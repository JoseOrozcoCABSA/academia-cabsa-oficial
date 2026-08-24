/**
 * @file Modelo `CabsaPendientes` — tabla `usuarios_pendientes`.
 *
 * 26 columnas, 23 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `signup_id`: BIGINT
 * - `usuario`: STRING(190)  · NOT NULL
 * - `correo`: STRING(190)  · NOT NULL
 * - `dominio_correo`: STRING(190)  · NOT NULL
 * - `es_fomaqro`: BOOLEAN  · NOT NULL
 * - `rfc`: STRING(20)  · NOT NULL
 * - `region_id`: STRING(20)  · NOT NULL
 * - `region_nombre`: STRING(190)  · NOT NULL
 * - `coordinador`: STRING(190)  · NOT NULL
 * - `clave_estado`: CHAR(2)  · NOT NULL
 * - `estado`: STRING(190)  · NOT NULL
 * - `clave_municipio`: CHAR(3)  · NOT NULL
 * - `municipio`: STRING(190)  · NOT NULL
 * - `codigo_postal`: CHAR(5)  · NOT NULL
 * - `colonia`: STRING(190)  · NOT NULL
 * - `ciudad`: STRING(190)  · NOT NULL
 * - `tipo_asentamiento`: STRING(120)  · NOT NULL
 * - `zona`: STRING(80)  · NOT NULL
 * - `estatus`: ENUM("pendiente", "activado", "cancelado", "error")  · NOT NULL
 * - `origen`: STRING(80)  · NOT NULL
 * - `validacion_estado`: STRING(80)  · NOT NULL
 * - `validacion_mensaje`: TEXT
 * - `creado_en`: DATE  · NOT NULL
 * - `actualizado_en`: DATE  · NOT NULL
 * - `activado_en`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_pendientes`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaPendientes.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaPendientes extends Model {}

CabsaPendientes.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "signup_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "usuario": { type: DataTypes.STRING(190), allowNull: false },
  "correo": { type: DataTypes.STRING(190), allowNull: false },
  "dominio_correo": { type: DataTypes.STRING(190), allowNull: false },
  "es_fomaqro": { type: DataTypes.BOOLEAN, allowNull: false },
  "rfc": { type: DataTypes.STRING(20), allowNull: false },
  "region_id": { type: DataTypes.STRING(20), allowNull: false },
  "region_nombre": { type: DataTypes.STRING(190), allowNull: false },
  "coordinador": { type: DataTypes.STRING(190), allowNull: false },
  "clave_estado": { type: DataTypes.CHAR(2), allowNull: false },
  "estado": { type: DataTypes.STRING(190), allowNull: false },
  "clave_municipio": { type: DataTypes.CHAR(3), allowNull: false },
  "municipio": { type: DataTypes.STRING(190), allowNull: false },
  "codigo_postal": { type: DataTypes.CHAR(5), allowNull: false },
  "colonia": { type: DataTypes.STRING(190), allowNull: false },
  "ciudad": { type: DataTypes.STRING(190), allowNull: false },
  "tipo_asentamiento": { type: DataTypes.STRING(120), allowNull: false },
  "zona": { type: DataTypes.STRING(80), allowNull: false },
  "estatus": { type: DataTypes.ENUM("pendiente", "activado", "cancelado", "error"), allowNull: false },
  "origen": { type: DataTypes.STRING(80), allowNull: false },
  "validacion_estado": { type: DataTypes.STRING(80), allowNull: false },
  "validacion_mensaje": { type: DataTypes.TEXT, allowNull: true },
  "creado_en": { type: DataTypes.DATE, allowNull: false },
  "actualizado_en": { type: DataTypes.DATE, allowNull: false },
  "activado_en": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaPendientes',
  tableName: "usuarios_pendientes",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
