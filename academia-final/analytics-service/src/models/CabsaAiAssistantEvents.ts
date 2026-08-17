/**
 * @file Modelo `CabsaAiAssistantEvents` — tabla `analitica_eventos_asistentes_ia`.
 *
 * 17 columnas, 14 obligatorias.
 * Clave primaria: `id`.
 *
 * El servicio no gestiona `createdAt`/`updatedAt` automáticamente (`timestamps: false`
 * global), así que las columnas de fecha se escriben de forma explícita.
 *
 * Columnas:
 * - `id`: BIGINT  · PK · NOT NULL
 * - `event_type`: STRING(24)  · NOT NULL
 * - `area`: STRING(24)  · NOT NULL
 * - `level_slug`: STRING(40)  · NOT NULL
 * - `agent_key`: STRING(80)  · NOT NULL
 * - `agent_title`: STRING(190)  · NOT NULL
 * - `card_index`: INTEGER  · NOT NULL
 * - `page_id`: BIGINT  · NOT NULL
 * - `page_url`: TEXT
 * - `referrer`: TEXT
 * - `user_id`: BIGINT  · NOT NULL
 * - `session_hash`: CHAR(64)  · NOT NULL
 * - `ip_hash`: CHAR(64)  · NOT NULL
 * - `user_agent`: TEXT
 * - `device`: STRING(24)  · NOT NULL
 * - `viewport`: STRING(30)  · NOT NULL
 * - `created_at`: DATE  · NOT NULL
 *
 * @see index.ts Registro de recursos que expone el servicio.
 */

import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

/**
 * Modelo Sequelize de `analitica_eventos_asistentes_ia`.
 *
 * La clase queda vacía a propósito: las columnas y las opciones se
 * declaran en `CabsaAiAssistantEvents.init()`, justo debajo. Cualquier consulta pasa
 * por el repositorio genérico, no por este modelo directamente.
 */
export default class CabsaAiAssistantEvents extends Model {}

CabsaAiAssistantEvents.init({
  "id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, primaryKey: true, autoIncrement: true },
  "event_type": { type: DataTypes.STRING(24), allowNull: false },
  "area": { type: DataTypes.STRING(24), allowNull: false },
  "level_slug": { type: DataTypes.STRING(40), allowNull: false },
  "agent_key": { type: DataTypes.STRING(80), allowNull: false },
  "agent_title": { type: DataTypes.STRING(190), allowNull: false },
  "provider": { type: DataTypes.STRING(20), allowNull: true },
  "card_index": { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  "page_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "page_url": { type: DataTypes.TEXT, allowNull: true },
  "referrer": { type: DataTypes.TEXT, allowNull: true },
  "user_id": { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  "account_id": { type: DataTypes.CHAR(36), allowNull: true },
  "session_hash": { type: DataTypes.CHAR(64), allowNull: false },
  "ip_hash": { type: DataTypes.CHAR(64), allowNull: false },
  "user_agent": { type: DataTypes.TEXT, allowNull: true },
  "device": { type: DataTypes.STRING(24), allowNull: false },
  "viewport": { type: DataTypes.STRING(30), allowNull: false },
  "created_at": { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaAiAssistantEvents',
  tableName: "analitica_eventos_asistentes_ia",
  timestamps: false,
  freezeTableName: true,
  underscored: false,
});
