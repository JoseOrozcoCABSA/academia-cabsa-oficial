/**
 * @file Reexporta `Textarea` desde el barril de componentes comunes.
 *
 * Existe para poder importar `Textarea` por su propia ruta además de
 * hacerlo desde `@/components/common/index`. No añade comportamiento.
 */

export { Textarea as default, Textarea } from '@/components/common/index';
