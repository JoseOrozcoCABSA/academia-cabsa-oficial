/**
 * @file Pantalla `DocumentsLibrary`.
 *
 * Envoltorio sobre `ContentLibrary`: fija sus propiedades y no añade lógica.
 *
 * El archivo está escrito en una sola línea en el original.
 *
 * @see @/pages/content/ContentLibrary Implementación.
 */

import ContentLibrary from '@/pages/content/ContentLibrary'; export default function DocumentsLibrary(){return <ContentLibrary type="documents" title="Documentos" />}
