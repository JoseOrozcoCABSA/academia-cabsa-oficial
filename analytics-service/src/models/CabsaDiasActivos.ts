/**
 * @file Modelo `CabsaDiasActivos` — tabla `analitica_dias_activos`.
 *
 * 6 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `user_id`: BIGINT  · NOT NULL
 * - `fecha`: DATEONLY  · NOT NULL
 * - `ultimo_acceso`: DATE  · NOT NULL
 * - `visitas`: INTEGER  · NOT NULL
 * - `fuente`: STRING(50)  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_dias_activos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaDiasActivos.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaDiasActivos extends Model {}

CabsaDiasActivos.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "fecha": { type: DataTypes.DATEONLY, allowNull: false },
  "ultimo_acceso": { type: DataTypes.DATE, allowNull: false },
  "visitas": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "fuente": { type: DataTypes.STRING(50), allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaDiasActivos',
  tableName: "analitica_dias_activos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
