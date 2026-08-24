/**
 * @file Reexporta `Card` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Card` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Card as default, Card } from '@/components/common/index';
