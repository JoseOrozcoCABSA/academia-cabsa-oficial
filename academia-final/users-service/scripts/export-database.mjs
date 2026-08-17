import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

dotenv.config({ path: resolve('../.env'), quiet: true });

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const output = resolve(process.argv[2] || `../database-backups/academia-soa-${stamp}.sql`);
await mkdir(dirname(output), { recursive: true });
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
});
const stream = createWriteStream(output, { encoding: 'utf8' });
const write = (value) => new Promise((resolveWrite, reject) => {
  if (stream.write(value)) return resolveWrite();
  const failed = (error) => { stream.off('drain', drained); reject(error); };
  const drained = () => { stream.off('error', failed); resolveWrite(); };
  stream.once('drain', drained);
  stream.once('error', failed);
});
const identifier = (value) => `\`${String(value).replaceAll('`', '``')}\``;

try {
  await write(`-- Academia CABSA database backup\n-- Created: ${new Date().toISOString()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`);
  const [objects] = await connection.query('SHOW FULL TABLES');
  const nameKey = Object.keys(objects[0] || {})[0];
  const tables = objects.filter((row) => row.Table_type === 'BASE TABLE').map((row) => row[nameKey]);
  const views = objects.filter((row) => row.Table_type === 'VIEW').map((row) => row[nameKey]);
  for (const table of tables) {
    const [createRows] = await connection.query(`SHOW CREATE TABLE ${identifier(table)}`);
    await write(`DROP TABLE IF EXISTS ${identifier(table)};\n${createRows[0]['Create Table']};\n`);
    let offset = 0;
    while (true) {
      const [rows, fields] = await connection.query(`SELECT * FROM ${identifier(table)} LIMIT 500 OFFSET ${offset}`);
      if (!rows.length) break;
      const columns = fields.map((field) => identifier(field.name)).join(',');
      const values = rows.map((row) => `(${fields.map((field) => connection.escape(row[field.name])).join(',')})`).join(',\n');
      await write(`INSERT INTO ${identifier(table)} (${columns}) VALUES\n${values};\n`);
      offset += rows.length;
    }
    await write('\n');
  }
  for (const view of views) {
    const [createRows] = await connection.query(`SHOW CREATE VIEW ${identifier(view)}`);
    await write(`DROP VIEW IF EXISTS ${identifier(view)};\n${createRows[0]['Create View']};\n\n`);
  }
  await write('SET FOREIGN_KEY_CHECKS=1;\n');
  console.log(output);
} finally {
  await connection.end();
  await new Promise((resolveEnd, reject) => stream.end((error) => error ? reject(error) : resolveEnd()));
}
