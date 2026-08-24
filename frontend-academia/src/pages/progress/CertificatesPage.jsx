/**
 * @file Componente `CertificatesPage`.
 *
 * Consulta los certificados del usuario autenticado.
 */

import { useEffect, useState } from 'react';
import { Award, Download } from 'lucide-react';
import { Card, EmptyState, Loader } from '@/components/common';
import { apiClient } from '@/services/apiClient';
/**
 * Pantalla de certificados.
 *
 * Solo muestra certificados no revocados pertenecientes a la sesion actual.
 */
export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient('/api/academia/certificates/mine')
      .then((data) => setCertificates(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  const safeFileUrl = (value) => {
    if (!value) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch {
      return null;
    }
  };
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Reconoce tu esfuerzo</p><h1>Certificados</h1><p>Descarga las constancias obtenidas al completar tus cursos.</p></div></div>{error&&<div className="alert alert--error">{error}</div>}{loading?<Loader label="Cargando certificados" />:<section className="certificate-grid">{certificates.map((certificate)=>{const fileUrl=safeFileUrl(certificate.file_url);return <Card className="certificate ready" key={certificate.id}><Award /><div><small>Completado</small><h2>Certificado del curso #{certificate.course_id}</h2><p>Emitido el {new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(new Date(certificate.issued_at))}</p>{fileUrl&&<a className="button button--secondary" href={fileUrl} target="_blank" rel="noopener noreferrer"><Download /> Descargar PDF</a>}</div></Card>})}{!certificates.length&&<EmptyState title="Aún no tienes certificados" description="Tus constancias aparecerán aquí al completar los cursos elegibles." />}</section>}</div>;
}
