/**
 * Formatea un tamano en KB o MB segun su magnitud.
 *
 * Usa la convencion decimal sobre base 1024 (divide por 1024 y etiqueta «KB»),
 * que es la que muestran los sistemas operativos, no la estrictamente correcta
 * («KiB»). Los KB se redondean a entero y los MB a un decimal.
 */
export const fileSize = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
