/** @file Hace reproducibles las restricciones que sostienen la concurrencia. */
import { QueryTypes } from 'sequelize';
import database from '#config/database';

interface Constraint {
  table: string;
  index: string;
  columns: string[];
}

const constraints: Constraint[] = [
  { table: 'usuarios_cuentas', index: 'user_accounts_email_uq', columns: ['email'] },
  { table: 'usuarios_cuentas', index: 'user_accounts_username_uq', columns: ['username'] },
  { table: 'usuarios_asignaciones_roles', index: 'user_role_assignment_uq', columns: ['user_id', 'role_id'] },
  { table: 'usuarios_gestores_grupos', index: 'teacher_managed_group_uq', columns: ['docente_user_id'] },
  { table: 'usuarios_grupos_cuentas', index: 'group_account_member_uq', columns: ['grupo_id', 'user_id'] },
];

const quote = (identifier: string): string => `\`${identifier.replaceAll('`', '``')}\``;

async function hasEquivalentUniqueIndex(item: Constraint): Promise<boolean> {
  const rows = await database.query<{ INDEX_NAME: string; columns: string }>(
    `SELECT INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) columns
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:tableName AND NON_UNIQUE=0
     GROUP BY INDEX_NAME`,
    { replacements: { tableName: item.table }, type: QueryTypes.SELECT },
  );
  return rows.some((row) => row.columns === item.columns.join(','));
}

async function ensureUnique(item: Constraint): Promise<void> {
  if (await hasEquivalentUniqueIndex(item)) return;
  const group = item.columns.map(quote).join(',');
  const duplicates = await database.query<Record<string, unknown>>(
    `SELECT ${group},COUNT(*) duplicate_count FROM ${quote(item.table)}
     GROUP BY ${group} HAVING COUNT(*)>1 LIMIT 5`,
    { type: QueryTypes.SELECT },
  );
  if (duplicates.length) {
    throw new Error(`No se puede crear ${item.index}: ${item.table} contiene duplicados en ${item.columns.join(', ')}`);
  }
  await database.query(
    `ALTER TABLE ${quote(item.table)} ADD UNIQUE KEY ${quote(item.index)} (${group})`,
  );
}

async function migrate(): Promise<void> {
  for (const constraint of constraints) await ensureUnique(constraint);
  console.log('Restricciones de integridad verificadas correctamente.');
}

migrate()
  .then(() => database.close())
  .catch(async (error) => {
    console.error(error);
    await database.close();
    process.exitCode = 1;
  });
