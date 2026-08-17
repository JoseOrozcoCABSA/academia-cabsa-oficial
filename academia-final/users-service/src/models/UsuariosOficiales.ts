/**
 * @file Modelo `UsuariosOficiales` — tabla `usuarios_oficiales`.
 *
 * 27 columnas, 24 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `usuario`: STRING(190)  · NOT NULL
 * - `correo`: STRING(190)  · NOT NULL
 * - `nombre_visible`: STRING(250)  · NOT NULL
 * - `nombre`: STRING(190)  · NOT NULL
 * - `apellidos`: STRING(190)  · NOT NULL
 * - `rfc`: STRING(20)  · NOT NULL
 * - `estado_cuenta`: ENUM("activo", "inactivo")  · NOT NULL
 * - `fecha_registro`: DATE
 * - `es_fomaqro`: BOOLEAN  · NOT NULL
 * - `region_administrativa`: STRING(190)  · NOT NULL
 * - `coordinador`: STRING(190)  · NOT NULL
 * - `municipio_capturado`: STRING(190)  · NOT NULL
 * - `estado_oficial`: STRING(190)  · NOT NULL
 * - `clave_estado`: CHAR(2)  · NOT NULL
 * - `municipio_oficial`: STRING(190)  · NOT NULL
 * - `clave_municipio`: CHAR(3)  · NOT NULL
 * - `clave_geografica`: CHAR(6)  · NOT NULL
 * - `codigo_postal`: CHAR(5)  · NOT NULL
 * - `colonia`: STRING(190)  · NOT NULL
 * - `estatus_geografico`: ENUM("completo", "parcial", "pendiente")  · NOT NULL
 * - `estatus_identidad`: ENUM("correcto", "duplicado_probable", "incompleto")  · NOT NULL
 * - `observaciones_calidad`: TEXT
 * - `ultimo_login`: DATE
 * - `total_inicios_sesion`: BIGINT  · NOT NULL
 * - `creado_en`: DATE  · NOT NULL
 * - `actualizado_en`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_oficiales`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `UsuariosOficiales.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class UsuariosOficiales extends Model {}

UsuariosOficiales.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "usuario": { type: DataTypes.STRING(190), allowNull: false },
  "correo": { type: DataTypes.STRING(190), allowNull: false },
  "nombre_visible": { type: DataTypes.STRING(250), allowNull: false },
  "nombre": { type: DataTypes.STRING(190), allowNull: false },
  "apellidos": { type: DataTypes.STRING(190), allowNull: false },
  "rfc": { type: DataTypes.STRING(20), allowNull: false },
  "estado_cuenta": { type: DataTypes.ENUM("activo", "inactivo"), allowNull: false },
  "fecha_registro": { type: DataTypes.DATE, allowNull: true },
  "es_fomaqro": { type: DataTypes.BOOLEAN, allowNull: false },
  "region_administrativa": { type: DataTypes.STRING(190), allowNull: false },
  "coordinador": { type: DataTypes.STRING(190), allowNull: false },
  "municipio_capturado": { type: DataTypes.STRING(190), allowNull: false },
  "estado_oficial": { type: DataTypes.STRING(190), allowNull: false },
  "clave_estado": { type: DataTypes.CHAR(2), allowNull: false },
  "municipio_oficial": { type: DataTypes.STRING(190), allowNull: false },
  "clave_municipio": { type: DataTypes.CHAR(3), allowNull: false },
  "clave_geografica": { type: DataTypes.CHAR(6), allowNull: false },
  "codigo_postal": { type: DataTypes.CHAR(5), allowNull: false },
  "colonia": { type: DataTypes.STRING(190), allowNull: false },
  "estatus_geografico": { type: DataTypes.ENUM("completo", "parcial", "pendiente"), allowNull: false },
  "estatus_identidad": { type: DataTypes.ENUM("correcto", "duplicado_probable", "incompleto"), allowNull: false },
  "observaciones_calidad": { type: DataTypes.TEXT, allowNull: true },
  "ultimo_login": { type: DataTypes.DATE, allowNull: true },
  "total_inicios_sesion": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "creado_en": { type: DataTypes.DATE, allowNull: false },
  "actualizado_en": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'UsuariosOficiales',
  tableName: "usuarios_oficiales",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
