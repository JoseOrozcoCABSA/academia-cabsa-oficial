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

import multer from 'multer';

/**
 * Almacenamiento en disco.
 *
 * El nombre se sanea sustituyendo por `_` todo lo que no sea alfanumerico,
 * punto, guion o guion bajo, con lo que no sobreviven secuencias de travesia de
 * rutas.
 */
const storage = multer.diskStorage({
  destination: 'src/storage/temp',
  filename: (_request, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    callback(null, `${Date.now()}-${safeName}`);
  },
});

/** Limite de 25 MB por archivo. Superarlo produce un error de multer. */
export default multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});
