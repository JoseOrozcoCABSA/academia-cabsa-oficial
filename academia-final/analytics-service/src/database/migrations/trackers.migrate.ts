import { DataTypes } from 'sequelize';
import database from '#config/database';

const table = 'analitica_eventos_asistentes_ia';

try {
  await database.authenticate();
  const queryInterface = database.getQueryInterface();
  const columns = await queryInterface.describeTable(table);
  if (!columns.account_id) {
    await queryInterface.addColumn(table, 'account_id', {
      type: DataTypes.CHAR(36),
      allowNull: true,
    });
  }
  if (!columns.provider) {
    await queryInterface.addColumn(table, 'provider', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  }
  const indexes = await queryInterface.showIndex(table) as unknown as Array<{ name: string }>;
  const indexNames = new Set(indexes.map((index) => index.name));
  if (!indexNames.has('analytics_ai_account_id_idx')) {
    await queryInterface.addIndex(table, ['account_id'], { name: 'analytics_ai_account_id_idx' });
  }
  if (!indexNames.has('analytics_ai_provider_idx')) {
    await queryInterface.addIndex(table, ['provider'], { name: 'analytics_ai_provider_idx' });
  }
  console.log('Migración de trackers aplicada correctamente.');
} finally {
  await database.close();
}
