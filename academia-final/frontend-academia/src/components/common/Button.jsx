/**
 * @file Reexporta `Button` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Button` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Button as default, Button } from '@/components/common/index';
