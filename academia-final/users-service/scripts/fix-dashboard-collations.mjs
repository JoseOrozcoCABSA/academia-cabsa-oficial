import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { mkdir, writeFile } from 'node:fs/promises';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const apply = process.argv.includes('--apply');
const database = process.env.DB_NAME || 'academia-soa';
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database,
  charset: 'utf8mb4',
});

const targets = {
  usuarios_cuentas: ['email'],
  usuarios_pendientes: ['correo'],
  usuarios_padrones_grupos_filas: ['correo', 'codigo'],
  usuarios_codigos_beca_email: ['code', 'allowed_email'],
  usuarios_activaciones_becas: ['codigo'],
};

try {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,
            CHARACTER_SET_NAME,COLLATION_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?)
        AND COLUMN_NAME IN ('email','correo','codigo','code','allowed_email')
      ORDER BY TABLE_NAME,ORDINAL_POSITION`,
    [database, Object.keys(targets)],
  );
  console.table(rows);
  if (!apply) process.exitCode = 0;
  else {
    const backupDirectory = new URL('../../database-backups/', import.meta.url);
    await mkdir(backupDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    await writeFile(new URL(`collations-before-${stamp}.json`, backupDirectory), JSON.stringify({ database, createdAt: new Date().toISOString(), columns: rows }, null, 2));
    await connection.query(`ALTER DATABASE \`${database.replaceAll('`', '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    for (const row of rows) {
      if (!targets[row.TABLE_NAME]?.includes(row.COLUMN_NAME)) continue;
      if (row.CHARACTER_SET_NAME !== 'utf8mb4' || row.COLLATION_NAME !== 'utf8mb4_unicode_ci') {
        const nullable = row.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultSql = row.COLUMN_DEFAULT === null
          ? (row.IS_NULLABLE === 'YES' ? ' DEFAULT NULL' : '')
          : ` DEFAULT ${connection.escape(row.COLUMN_DEFAULT)}`;
        const table = row.TABLE_NAME.replaceAll('`', '``');
        const column = row.COLUMN_NAME.replaceAll('`', '``');
        await connection.query(
          `ALTER TABLE \`${table}\` MODIFY \`${column}\` ${row.COLUMN_TYPE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ${nullable}${defaultSql}`,
        );
        console.log(`Normalizada ${row.TABLE_NAME}.${row.COLUMN_NAME}`);
      }
    }
    console.log('Intercalaciones del directorio y padrones normalizadas.');
  }
} finally {
  await connection.end();
}
