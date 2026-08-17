import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

export default class CabsaMediaAssets extends Model {}

CabsaMediaAssets.init({
  id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
  type: { type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT'), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  object_key: { type: DataTypes.STRING(500), allowNull: false, unique: true },
  original_name: { type: DataTypes.STRING(255), allowNull: false },
  mime_type: { type: DataTypes.STRING(120), allowNull: false },
  size_bytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  width: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  height: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  duration_seconds: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  alt_text: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'), allowNull: false, defaultValue: 'ACTIVE' },
  variants: { type: DataTypes.JSON, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
  created_by: { type: DataTypes.CHAR(36), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize: database,
  modelName: 'CabsaMediaAssets',
  tableName: 'contenido_archivos',
  timestamps: false,
  freezeTableName: true,
});
