/**
 * @file Pantalla `VideoLibrary`.
 *
 * Envoltorio sobre `ContentLibrary`: fija sus propiedades y no añade lógica.
 *
 * El archivo está escrito en una sola línea en el original.
 *
 * @see @/pages/content/ContentLibrary Implementación.
 */

import ContentLibrary from '@/pages/content/ContentLibrary'; export default function VideoLibrary(){return <ContentLibrary type="videos" title="Videoteca" />}
