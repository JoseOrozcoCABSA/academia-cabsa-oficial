/**
 * @file Modelo `CabsaUserBecas` — tabla `usuarios_becas`.
 *
 * 17 columnas, 12 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `rfc`: STRING(13)  · NOT NULL
 * - `rfc_status`: STRING(32)  · NOT NULL
 * - `socio_id`: INTEGER
 * - `solicitud_id`: INTEGER
 * - `beneficiario_beca_id`: INTEGER
 * - `convocatoria_id`: INTEGER
 * - `beca_id`: INTEGER
 * - `becas_correo`: STRING(100)  · NOT NULL
 * - `total_becas_aprobadas`: INTEGER  · NOT NULL
 * - `total_convocatorias`: INTEGER  · NOT NULL
 * - `total_convocatorias_activas`: INTEGER  · NOT NULL
 * - `historial_completo`: BOOLEAN  · NOT NULL
 * - `veces_convocatoria_actual`: INTEGER  · NOT NULL
 * - `validated_at`: DATE  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 * - `updated_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_becas`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaUserBecas.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaUserBecas extends Model {}

CabsaUserBecas.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "rfc": { type: DataTypes.STRING(13), allowNull: false },
  "rfc_status": { type: DataTypes.STRING(32), allowNull: false },
  "socio_id": { type: DataTypes.INTEGER, allowNull: true },
  "solicitud_id": { type: DataTypes.INTEGER, allowNull: true },
  "beneficiario_beca_id": { type: DataTypes.INTEGER, allowNull: true },
  "convocatoria_id": { type: DataTypes.INTEGER, allowNull: true },
  "beca_id": { type: DataTypes.INTEGER, allowNull: true },
  "becas_correo": { type: DataTypes.STRING(100), allowNull: false },
  "total_becas_aprobadas": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "total_convocatorias": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "total_convocatorias_activas": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "historial_completo": { type: DataTypes.BOOLEAN, allowNull: false },
  "veces_convocatoria_actual": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "validated_at": { type: DataTypes.DATE, allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
  "updated_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaUserBecas',
  tableName: "usuarios_becas",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
