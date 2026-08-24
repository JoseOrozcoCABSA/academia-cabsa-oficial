/**
 * @file Recepcion de archivos subidos.
 *
 * Guarda en disco, en `src/storage/temp`, con el nombre prefijado por la marca
 * de tiempo para evitar colisiones.
 *
 * Dos cosas que no hace, y que hay que cubrir aparte:
 * - No filtra por tipo: acepta cualquier extension y cualquier contenido. Si el
 *   endpoint espera solo imagenes o PDF, hay que validarlo en su servicio.
 * - No limpia `src/storage/temp`. Los archivos se acumulan hasta que algo los
 *   mueva o los borre.
 *
 * La ruta es relativa al directorio desde el que se arranco el proceso.
 *
 * @see middlewares/upload.middleware.ts Uso para un archivo unico.
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import env from '#config/env';

/**
 * Un archivo de video no debe ocupar RAM dentro del proceso. El temporal se
 * elimina siempre desde media.service después de validar y persistir.
 */
const temporaryDirectory = path.resolve(process.cwd(), 'runtime-media-temp');
mkdirSync(temporaryDirectory, { recursive: true });

export default multer({
  storage: multer.diskStorage({
    destination: temporaryDirectory,
    filename: (_request, _file, callback) =>
      callback(null, `${Date.now()}-${randomUUID()}.upload`),
  }),
  limits: { fileSize: env.mediaMaxFileMb * 1024 * 1024 },
});
