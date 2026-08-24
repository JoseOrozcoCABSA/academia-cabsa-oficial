/**
 * @file Reexporta `Badge` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Badge` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Badge as default, Badge } from '@/components/common/index';
