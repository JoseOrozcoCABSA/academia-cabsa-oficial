/**
 * @file Componente `ContentLibrary`.
 *
 * Consume: `contentService`.
 *
 * Usa `useRemoteList` con un catálogo de reserva: si la API falla o
 * responde vacío, la pantalla muestra datos estáticos en lugar de
 * quedar en blanco. El indicador `usingReference` es la única señal
 * de que lo mostrado no viene del servidor.
 */

import { useCallback, useState } from 'react';
import { FileText, Film, Grid3X3, Search } from 'lucide-react';
import { contentService } from '@/services/contentService';
import { capsules as referenceCapsules } from '@/data/referenceCatalog';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Loader } from '@/components/common';
/**
 * Cuadricula generica de contenido, reutilizada para varios tipos.
 *
 * El tipo determina que se pide y si hay catalogo de reserva: solo las capsulas
 * lo tienen, asi que para los demas tipos un fallo de la API deja la pantalla
 * vacia.
 */
export default function ContentLibrary({ type = 'capsules', title = 'Mediateca', description = 'Explora materiales educativos, cápsulas, videos y documentos.' }) {
  const fallback = type === 'capsules' ? referenceCapsules : [];
  /** Carga del tipo indicado; se rehace si cambia el tipo. */
  const load = useCallback(() => contentService.list(type), [type]);
  const { items, loading, error, usingReference } = useRemoteList(load, fallback);
  const [search, setSearch] = useState('');
  // Filtro en cliente por titulo o nombre. Se recalcula en cada render (sin
  // memo) y no ignora acentos.
  const filtered = items.filter((item) => (item.title || item.name || '').toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Contenido CABSA</p><h1>{title}</h1><p>{description}</p></div><label className="search search--page"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contenido" /></label></div>
    <div className="filter-tabs"><span><Grid3X3 /> Todo</span><span><Film /> Videos</span><span><FileText /> Documentos</span></div>
    {error && <div className="alert">{error} Mostramos el contenido disponible localmente.</div>}{usingReference && !error && <div className="source-note">Contenido académico de referencia.</div>}
    {loading ? <Loader /> : <section className="library-grid">{filtered.length ? filtered.map((item) => <article key={item.id || item.slug}><div className="library-image">{item.image ? <img src={item.image} alt="" /> : type === 'videos' ? <Film /> : <FileText />}</div><div><Badge tone="gold">{item.category || type}</Badge><h3>{item.title || item.name}</h3><p>{item.summary || item.description || 'Recurso educativo disponible en Academia CABSA.'}</p><button className="text-button">Abrir recurso</button></div></article>) : <div className="empty-inline">Aún no hay {title.toLowerCase()} en MySQL.</div>}</section>}</div>;
}
