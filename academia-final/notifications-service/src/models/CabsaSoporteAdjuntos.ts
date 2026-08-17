/**
 * @file Modelo `CabsaSoporteAdjuntos` — tabla `notificaciones_soporte_adjuntos`.
 *
 * 9 columnas, 4 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `ticket_id`: BIGINT  · NOT NULL
 * - `user_id`: BIGINT
 * - `attachment_id`: BIGINT
 * - `archivo_url`: TEXT  · NOT NULL
 * - `archivo_nombre`: TEXT
 * - `mime_type`: STRING(120)
 * - `size_bytes`: BIGINT
 * - `creado_en`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `notificaciones_soporte_adjuntos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaSoporteAdjuntos.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaSoporteAdjuntos extends Model {}

CabsaSoporteAdjuntos.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  attachment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  archivo_url: { type: DataTypes.TEXT, allowNull: false },
  archivo_nombre: { type: DataTypes.TEXT, allowNull: true },
  mime_type: { type: DataTypes.STRING(120), allowNull: true },
  size_bytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaSoporteAdjuntos',
  tableName: 'notificaciones_soporte_adjuntos',
  timestamps: false,
  freezeTableName: true,
});
