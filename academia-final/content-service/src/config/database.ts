/**
 * @file Conexion Sequelize a MySQL, compartida por todo el servicio.
 *
 * Decisiones globales que afectan a cada modelo:
 * - `freezeTableName`: el nombre de tabla se usa literal, sin pluralizar.
 * - `timestamps: false`: Sequelize no gestiona `createdAt`/`updatedAt`; las
 *   tablas que las tengan las manejan por su cuenta.
 * - `logging: false`: no se registra ningun SQL, ni en desarrollo. Para depurar
 *   una consulta hay que activarlo aqui temporalmente.
 *
 * El pool se configura por replica. Un valor pequeno evita multiplicar cientos
 * de conexiones al escalar horizontalmente; un proxy de conexiones puede
 * multiplexarlas delante de MySQL.
 *
 * @see config/env.ts Credenciales y host.
 */

import { Sequelize } from 'sequelize';
import env from '#config/env';

const poolNumber = (name: string, fallback: number, minimum: number): number => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value >= minimum ? value : fallback;
};

const database = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: false,
    define: { freezeTableName: true, timestamps: false },
    pool: {
      max: poolNumber('DB_POOL_MAX', 5, 1),
      min: poolNumber('DB_POOL_MIN', 0, 0),
      acquire: poolNumber('DB_POOL_ACQUIRE_MS', 10000, 1000),
      idle: poolNumber('DB_POOL_IDLE_MS', 10000, 1000),
      evict: poolNumber('DB_POOL_EVICT_MS', 1000, 100),
    },
  },
);

export default database;
