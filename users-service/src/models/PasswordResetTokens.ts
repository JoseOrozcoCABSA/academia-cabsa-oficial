/**
 * @file Modelo `PasswordResetTokens` — tabla `usuarios_tokens_restablecimiento`.
 *
 * 3 columnas, 2 obligatorias.
 * Clave primaria: `email`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `email`: STRING(255)  · PK · NOT NULL
 * - `token`: STRING(255)  · NOT NULL
 * - `created_at`: DATE
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `usuarios_tokens_restablecimiento`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `PasswordResetTokens.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class PasswordResetTokens extends Model {}

PasswordResetTokens.init({
  "email": { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
  "token": { type: DataTypes.STRING(255), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: database,
  modelName: 'PasswordResetTokens',
  tableName: "usuarios_tokens_restablecimiento",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
