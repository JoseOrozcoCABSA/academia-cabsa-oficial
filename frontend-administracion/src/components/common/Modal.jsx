/**
 * @file Reexporta `Modal` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Modal` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Modal as default, Modal } from '@/components/common/index';
