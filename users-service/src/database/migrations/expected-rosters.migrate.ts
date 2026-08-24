import database from '#config/database';
import { ensureGroupRosterSchema } from '../group-rosters.schema.js';

async function migrate() {
  await database.authenticate();
  await ensureGroupRosterSchema();
  const [summary] = await database.query(
    `SELECT
      (SELECT COUNT(*) FROM usuarios_padrones_esperados) padrones,
      (SELECT COUNT(*) FROM usuarios_padrones_grupos_importaciones) importaciones,
      (SELECT COUNT(*) FROM usuarios_padrones_grupos_filas) filas`,
  );
  console.log(JSON.stringify(summary, null, 2));
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => database.close());
