import { DataTypes } from 'sequelize';
import database from '#config/database';

const run = async (): Promise<void> => {
  const queryInterface = database.getQueryInterface();
  const columns = await queryInterface.describeTable('contenido_capsulas');
  if (!columns.image_position) {
    await queryInterface.addColumn('contenido_capsulas', 'image_position', {
      type: DataTypes.ENUM('top', 'bottom'),
      allowNull: false,
      defaultValue: 'top',
    });
    console.log('Migración: contenido_capsulas.image_position creada.');
  }
};

run()
  .then(() => database.close())
  .catch(async (error) => {
    console.error('No fue posible migrar la posición de imagen del blog:', error);
    await database.close().catch(() => undefined);
    process.exitCode = 1;
  });
