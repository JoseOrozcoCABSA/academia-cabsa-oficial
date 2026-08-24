/**
 * @file Reexporta `Select` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Select` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Select as default, Select } from '@/components/common/index';
