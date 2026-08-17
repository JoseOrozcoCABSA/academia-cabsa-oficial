/**
 * @file Modelo `CabsaFomaqroRegistros` — tabla `usuarios_fomaqro_registros`.
 *
 * 33 columnas, 9 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `user_id`: BIGINT
 * - `account_user_id`: CHAR(36)
 * - `user_login`: STRING(190)
 * - `user_email`: STRING(190)
 * - `fomaqro_member`: STRING(10)  · NOT NULL
 * - `rfc`: STRING(20)
 * - `region_id`: STRING(20)
 * - `region_nombre`: STRING(190)
 * - `municipio`: STRING(190)
 * - `municipio_id`: STRING(10)
 * - `estado_id`: STRING(10)
 * - `estado`: STRING(190)
 * - `coordinador`: STRING(190)
 * - `rfc_status`: STRING(80)
 * - `rfc_message`: TEXT
 * - `validated_at`: DATE
 * - `socio_id`: BIGINT
 * - `solicitud_id`: BIGINT
 * - `beneficiario_beca_id`: BIGINT
 * - `convocatoria_id`: BIGINT
 * - `beca_id`: BIGINT
 * - `becas_correo`: STRING(190)
 * - `total_becas_aprobadas`: INTEGER  · NOT NULL
 * - `total_convocatorias`: INTEGER  · NOT NULL
 * - `total_convocatorias_activas`: INTEGER  · NOT NULL
 * - `historial_completo`: BOOLEAN  · NOT NULL
 * - `veces_convocatoria_actual`: INTEGER  · NOT NULL
 * - `origen`: STRING(80)
 * - `creado_en`: DATE  · NOT NULL
 * - `actualizado_en`: DATE  · NOT NULL
 * - `codigo_postal`: STRING(10)
 * - `colonia`: STRING(190)
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_fomaqro_registros`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaFomaqroRegistros.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaFomaqroRegistros extends Model {}

CabsaFomaqroRegistros.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "account_user_id": { type: DataTypes.CHAR(36), allowNull: true },
  "user_login": { type: DataTypes.STRING(190), allowNull: true },
  "user_email": { type: DataTypes.STRING(190), allowNull: true },
  "fomaqro_member": { type: DataTypes.STRING(10), allowNull: false },
  "rfc": { type: DataTypes.STRING(20), allowNull: true },
  "region_id": { type: DataTypes.STRING(20), allowNull: true },
  "region_nombre": { type: DataTypes.STRING(190), allowNull: true },
  "municipio": { type: DataTypes.STRING(190), allowNull: true },
  "municipio_id": { type: DataTypes.STRING(10), allowNull: true },
  "estado_id": { type: DataTypes.STRING(10), allowNull: true },
  "estado": { type: DataTypes.STRING(190), allowNull: true },
  "coordinador": { type: DataTypes.STRING(190), allowNull: true },
  "rfc_status": { type: DataTypes.STRING(80), allowNull: true },
  "rfc_message": { type: DataTypes.TEXT, allowNull: true },
  "validated_at": { type: DataTypes.DATE, allowNull: true },
  "socio_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "solicitud_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "beneficiario_beca_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "convocatoria_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "beca_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  "becas_correo": { type: DataTypes.STRING(190), allowNull: true },
  "total_becas_aprobadas": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "total_convocatorias": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "total_convocatorias_activas": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "historial_completo": { type: DataTypes.BOOLEAN, allowNull: false },
  "veces_convocatoria_actual": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "origen": { type: DataTypes.STRING(80), allowNull: true },
  "creado_en": { type: DataTypes.DATE, allowNull: false },
  "actualizado_en": { type: DataTypes.DATE, allowNull: false },
  "codigo_postal": { type: DataTypes.STRING(10), allowNull: true },
  "colonia": { type: DataTypes.STRING(190), allowNull: true },
}, {
  sequelize: database,
  modelName: 'CabsaFomaqroRegistros',
  tableName: "usuarios_fomaqro_registros",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
