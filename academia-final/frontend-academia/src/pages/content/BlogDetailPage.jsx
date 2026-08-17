import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Loader } from '@/components/common';
import { contentService } from '@/services/contentService';
import { sanitizeContentHtml } from '@/utils/sanitizeContentHtml';
import './blog.css';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    contentService.findBlogBySlug(slug).then((result) => active && setEntry(result)).catch((requestError) => active && setError(requestError.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);
  useEffect(() => { const previous = document.title; document.title = entry ? `${entry.title} — Academia CABSA` : 'Novedades — Academia CABSA'; return () => { document.title = previous; }; }, [entry]);
  const body = useMemo(() => sanitizeContentHtml(entry?.body || ''), [entry?.body]);
  const coverAtBottom = entry?.image_position === 'bottom';
  const cover = entry?.image && <img className={`blog-detail-cover${coverAtBottom ? ' blog-detail-cover--bottom' : ''}`} src={entry.image} alt={entry.title} />;
  return <div className="blog-public-page"><Header /><main id="contenido">{loading ? <div className="blog-state"><Loader label="Cargando novedad" /></div> : !entry ? <div className="blog-state"><h1>Entrada no encontrada</h1><p>{error || 'Esta novedad no está disponible.'}</p><Link to="/">Volver al inicio</Link></div> : <article className="blog-detail"><Link className="blog-back" to="/">← Volver a novedades</Link>{!coverAtBottom && cover}<p className="eyebrow">Novedades de la Academia</p><time>{entry.published_at ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(entry.published_at)) : ''}</time><h1>{entry.title}</h1><p className="blog-lead">{entry.summary}</p><div className="blog-body" dangerouslySetInnerHTML={{ __html: body }} />{coverAtBottom && cover}</article>}</main><Footer /></div>;
}
