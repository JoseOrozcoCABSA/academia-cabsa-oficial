/**
 * @file Reexporta `EmptyState` desde el barril de componentes comunes.
 *
 * Existe para poder importar `EmptyState` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { EmptyState as default, EmptyState } from '@/components/common/index';
