/**
 * @file Subida de las imagenes de evidencia de los tickets de soporte.
 *
 * Configura `multer` con tres restricciones que son la primera defensa del
 * servicio:
 *
 * - Como maximo 3 archivos de 5 MB cada uno, aplicado por `multer` **mientras**
 *   recibe el cuerpo, asi que un envio mayor se corta sin escribirse entero.
 * - Solo se aceptan imagenes JPG, PNG, WEBP y GIF. La comprobacion es sobre el
 *   `mimetype` declarado aqui y la firma binaria real en `support.service`.
 * - El nombre se reescribe: se sustituye por `_` todo lo que no sea alfanumerico,
 *   punto, guion o subrayado, y se antepone la marca de tiempo mas un valor
 *   aleatorio. Eso impide la travesia de rutas por el nombre original y evita
 *   que dos usuarios se sobrescriban el archivo.
 *
 * El nombre usa un UUID criptograficamente aleatorio; la descarga ademas exige
 * que el adjunto pertenezca al solicitante.
 *
 * Los archivos se escriben en disco **antes** de que se valide el ticket, de modo
 * que el servicio tiene que borrarlos en cada camino de fallo.
 *
 * @see services/support.service.ts Validacion, limpieza y descarga.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { AppError } from '#utils/errors';
import env from '#config/env';

/**
 * Directorio donde se guardan las evidencias de los tickets.
 *
 * Se resuelve a ruta absoluta desde `process.cwd()`, asi que **depende del
 * directorio desde el que se arranque el servicio**: lanzarlo desde otro sitio
 * apunta a un almacenamiento distinto y los adjuntos anteriores dejan de
 * encontrarse.
 *
 * Ademas de ser el destino de la subida, es el limite que comprueba el servicio
 * al descargar: una ruta que quede fuera de este prefijo se rechaza. Por eso se
 * exporta.
 *
 * Al estar bajo `src/`, un despliegue que solo copie lo compilado puede dejar
 * los archivos fuera del artefacto.
 *
 * @see services/support.service.ts Comprobacion contra travesia de rutas.
 */
export const supportStorageRoot = path.resolve(
  process.cwd(),
  env.supportStoragePath,
);

fs.mkdirSync(supportStorageRoot, { recursive: true });

const acceptedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, supportStorageRoot);
  },
  filename: (_request, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const nonce = randomUUID();
    callback(null, `${Date.now()}-${nonce}-${safeName}`);
  },
});

const uploader = multer({
  storage,
  limits: {
    files: 3,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!acceptedTypes.has(file.mimetype)) {
      callback(new AppError(
        'Solo se permiten imágenes JPG, PNG, WEBP o GIF.',
        400,
        'INVALID_ATTACHMENT_TYPE',
      ));
      return;
    }
    callback(null, true);
  },
});

export default uploader.array('attachments', 3);
