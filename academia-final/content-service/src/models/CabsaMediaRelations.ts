import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

export default class CabsaMediaRelations extends Model {}

CabsaMediaRelations.init({
  id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  asset_id: { type: DataTypes.CHAR(36), allowNull: false },
  entity_type: { type: DataTypes.ENUM('COURSE', 'LESSON', 'CAPSULE', 'MATERIAL'), allowNull: false },
  entity_id: { type: DataTypes.STRING(64), allowNull: false },
  usage_type: { type: DataTypes.ENUM('COVER', 'INLINE', 'ATTACHMENT'), allowNull: false },
  sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaMediaRelations',
  tableName: 'contenido_archivos_relaciones',
  timestamps: false,
  freezeTableName: true,
});
