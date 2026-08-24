/**
 * @file Configuracion del servicio leida del entorno.
 *
 * Carga el `.env`, valida los valores criticos y falla al arrancar si faltan.
 */

import dotenv from 'dotenv';

dotenv.config();

/** Forma de la configuracion expuesta. */
export interface Environment {
  port: number;
  bindHost: string;
  serviceName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  mediaStoragePath: string;
  mediaMaxFileMb: number;
  publicApiUrl: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
}

/**
 * Convierte una variable de entorno a numero.
 *
 * No valida: un valor no numerico produce `NaN` y se propaga tal cual, con lo
 * que el fallo aparecera mas tarde y lejos de aqui.
 */
const numberValue = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} debe ser un entero entre 1 y 65535`);
  }
  return value;
};

const requiredValue = (name: string, minimumLength = 1): string => {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} es obligatorio y debe tener al menos ${minimumLength} caracteres`);
  }
  return value;
};

const corsOrigins = (
  process.env.CORS_ORIGINS
  ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5007,http://localhost:5008')
).split(',').map((origin) => origin.trim()).filter(Boolean);
if (!corsOrigins.length) throw new Error('CORS_ORIGINS es obligatorio en produccion');

/** Configuracion congelada: cualquier intento de mutarla se ignora. */
const env: Readonly<Environment> = Object.freeze({
  port: numberValue('PORT', 5003),
  bindHost: process.env.BIND_HOST?.trim() || '127.0.0.1',
  serviceName: process.env.SERVICE_NAME ?? 'content-service',
  jwtSecret: requiredValue('JWT_SECRET', 32),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigins,
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH?.trim() || 'runtime-media',
  mediaMaxFileMb: numberValue('MEDIA_MAX_FILE_MB', 25),
  publicApiUrl: (process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, ''),
  database: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: numberValue('DB_PORT', 3306),
    name: process.env.DB_NAME ?? 'academia-soa',
    user: process.env.DB_USER ?? 'root',
    password: requiredValue('DB_PASSWORD'),
  },
});

export default env;
