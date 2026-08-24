/**
 * @file Componente `DocumentationPage`.
 *
 * Fija el título del documento a «Documentación — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 */

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import '@/documentation.css';

const manualUrl = 'https://academiacabsa.com/wp-content/uploads/2025/11/MANUAL.pptx';

const documents = [
  {
    title: 'Manual Integral de Academia CABSA',
    description: 'Referencia general para conocer las herramientas y espacios de la plataforma.',
    url: manualUrl,
    preview: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(manualUrl)}`,
    type: 'Presentación',
  },
  {
    title: 'Guía de registro e inscripción',
    description: 'Pasos para registrarte en el portal y completar el proceso de inscripción.',
    url: 'https://academiacabsa.com/wp-content/uploads/2026/05/Manual-de-Registro-Academia-CABSA.pdf',
    preview: 'https://academiacabsa.com/wp-content/uploads/2026/05/Manual-de-Registro-Academia-CABSA.pdf',
    type: 'PDF',
  },
];

/**
 * Listado de documentos descargables con vista previa incrustada.
 *
 * Los documentos son una lista fija en el archivo, no vienen de la API.
 */
export default function DocumentationPage() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Documentación — Academia CABSA';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  /**
   * Selecciona un documento y desplaza la vista hasta el visor.
   *
   * El desplazamiento va dentro de `requestAnimationFrame` porque el visor
   * todavia no existe en el DOM cuando se cambia el estado; sin esperar al
   * siguiente fotograma, la referencia seria nula y no se desplazaria.
   */
  const previewDocument = (documentItem) => {
    setSelectedDocument(documentItem);
    window.requestAnimationFrame(() => {
      viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="documentation-public-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />

      <main id="contenido">
        <section className="documentation-page">
          <div className="documentation-heading">
            <span className="eyebrow">Centro de ayuda</span>
            <h1>Documentación</h1>
            <p>Consulta las guías de Academia CABSA para comenzar y aprovechar mejor la plataforma.</p>
          </div>

          <div className="documentation-grid">
            {documents.map((documentItem) => (
              <article className="document-card" key={documentItem.title}>
                <div className="document-icon" aria-hidden="true">▣</div>
                <span className="document-type">{documentItem.type}</span>
                <h2>{documentItem.title}</h2>
                <p>{documentItem.description}</p>

                <div className="document-actions">
                  <a
                    className="document-button document-button--primary"
                    href={documentItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Descargar
                  </a>
                  <button
                    className="document-button document-button--secondary"
                    type="button"
                    onClick={() => previewDocument(documentItem)}
                  >
                    Previsualizar
                  </button>
                </div>
              </article>
            ))}
          </div>

          {selectedDocument && (
            <section className="documentation-viewer" ref={viewerRef} aria-label="Vista previa">
              <div className="viewer-header">
                <strong>{selectedDocument.title}</strong>
                <button type="button" onClick={() => setSelectedDocument(null)}>Cerrar</button>
              </div>
              <iframe
                src={selectedDocument.preview}
                title={`Vista previa de ${selectedDocument.title}`}
                allowFullScreen
              />
            </section>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
