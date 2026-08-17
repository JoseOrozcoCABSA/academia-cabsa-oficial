/**
 * @file Modelo `Jobs` — tabla `academia_trabajos`.
 *
 * 7 columnas, 6 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `queue`: STRING(255)  · NOT NULL
 * - `payload`: TEXT("long")  · NOT NULL
 * - `attempts`: INTEGER  · NOT NULL
 * - `reserved_at`: INTEGER
 * - `available_at`: INTEGER  · NOT NULL
 * - `created_at`: INTEGER  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `academia_trabajos`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `Jobs.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class Jobs extends Model {}

Jobs.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "queue": { type: DataTypes.STRING(255), allowNull: false },
  "payload": { type: DataTypes.TEXT("long"), allowNull: false },
  "attempts": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "reserved_at": { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  "available_at": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "created_at": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, {
  sequelize: database,
  modelName: 'Jobs',
  tableName: "academia_trabajos",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
