/**
 * @file Reexporta `Loader` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Loader` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Loader as default, Loader } from '@/components/common/index';
