/**
 * @file Reexporta `Table` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Table` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Table as default, Table } from '@/components/common/index';
