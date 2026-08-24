import database from '#config/database';
import env from '#config/env';

const sourceDatabase = process.env.SOURCE_DB_NAME ?? 'academia_cabsa';
const tables = [
  { source: 'estados', target: 'usuarios_estados' },
  { source: 'municipios', target: 'usuarios_municipios' },
  { source: 'ciudades', target: 'usuarios_ciudades' },
  { source: 'codigos_postales', target: 'usuarios_codigos_postales' },
  { source: 'colonias', target: 'usuarios_colonias' },
];

const identifier = (value: string): string => {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Identificador de base de datos inválido: ${value}`);
  }
  return `\`${value}\``;
};

const run = async (): Promise<void> => {
  await database.authenticate();
  const source = identifier(sourceDatabase);
  const target = identifier(env.database.name);
  const imported: Record<string, number> = {};

  for (const tableName of tables) {
    const sourceTable = identifier(tableName.source);
    const targetTable = identifier(tableName.target);
    await database.query(
      `INSERT IGNORE INTO ${target}.${targetTable}
       SELECT * FROM ${source}.${sourceTable}`,
    );
    const [rows] = await database.query(
      `SELECT COUNT(*) AS total FROM ${target}.${targetTable}`,
    ) as unknown as [{ total: number }[], unknown];
    imported[tableName.target] = Number(rows[0]?.total ?? 0);
  }

  process.stdout.write(`${JSON.stringify({
    sourceDatabase,
    targetDatabase: env.database.name,
    imported,
  })}\n`);
};

run()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });
