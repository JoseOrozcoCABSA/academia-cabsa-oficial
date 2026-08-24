/**
 * @file Middleware de subida de un unico archivo.
 *
 * Espera el archivo en el campo `file` de un `multipart/form-data` y lo deja en
 * `request.file`. Los limites de tamano y los tipos permitidos se configuran en
 * `config/multer.ts`, no aqui.
 *
 * @see config/multer.ts
 */

import uploader from '#config/multer';

export default uploader.single('file');
