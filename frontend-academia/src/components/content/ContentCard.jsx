/**
 * @file Componente `ContentCard`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

export default function ContentCard({item}){return <article><h3>{item.title}</h3><p>{item.summary}</p></article>}
