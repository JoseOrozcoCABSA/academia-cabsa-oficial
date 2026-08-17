/**
 * @file Reexporta `ConfirmDialog` desde el barril de componentes comunes.
 *
 * Existe para poder importar `ConfirmDialog` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { ConfirmDialog as default, ConfirmDialog } from '@/components/common/index';
