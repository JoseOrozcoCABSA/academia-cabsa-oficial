/**
 * @file Componente `GptAgentsPage`.
 *
 * Fija el título del documento a «Agentes GPT — Academia CABSA» mientras está
 * montado, y lo restaura al desmontarse.
 *
 */

import { useEffect } from 'react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { gptAgents } from '@/data/gptAgents';
import '@/gpt-agents.css';

/**
 * Directorio de agentes GPT agrupados por categoria.
 *
 * Todo el contenido es fijo, del catalogo en `data/gptAgents.js`: no hay
 * peticiones ni estados de carga.
 */
export default function GptAgentsPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Agentes GPT — Academia CABSA';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  /**
   * Agrupa los agentes por categoria en un `Map`.
   *
   * Se usa `Map` y no un objeto para conservar el orden de aparicion en el
   * catalogo, que es el orden en que se quieren mostrar las secciones.
   *
   * Se recalcula en cada render; es barato porque el catalogo es fijo y pequeno.
   */
  const categories = gptAgents.reduce((grouped, agent) => {
    const category = grouped.get(agent.category) ?? [];
    category.push(agent);
    grouped.set(agent.category, category);
    return grouped;
  }, new Map());

  return (
    <div className="gpt-agents-page">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
      <Header />
      <main id="contenido">
        <section className="gpt-store-container" data-ai-page data-ai-tool-type="agent">
          <header className="gpt-header">
            <p className="eyebrow">Herramientas IA</p>
            <h1 className="gpt-main-title">Agentes GPT</h1>
            <p className="gpt-subtitle">
              Explora nuestra colección de agentes desarrollados para potenciar el aprendizaje.
            </p>
          </header>

          {[...categories.entries()].map(([category, agents]) => (
            <section className="gpt-category-section" key={category}>
              <div className="gpt-section-title">
                <h2>{category}</h2>
                <span className="gpt-section-desc">{agents[0].categoryDescription}</span>
              </div>

              <div className="gpt-grid">
                {agents.map((agent) => <AgentCard agent={agent} key={agent.title} />)}
              </div>

              <hr className="gpt-separator" />
            </section>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Tarjeta de un agente, enlazada a su URL externa.
 *
 * Al abrirse fuera de la aplicacion debe llevar `rel="noopener"`; conviene
 * verificarlo si se edita el enlace.
 */
function AgentCard({ agent }) {
  return (
    <a
      href={agent.url}
      className="gpt-card"
      target="_blank"
      rel="noopener noreferrer"
      data-ai-provider="gpt"
    >
      <div className="gpt-card-icon">
        <div className="gpt-img-circle">
          {agent.image
            ? <img src={agent.image} alt={agent.title} loading="lazy" />
            : <span>{agent.icon}</span>}
        </div>
      </div>
      <div className="gpt-card-info">
        <div className="gpt-name">{agent.title}</div>
        <div className="gpt-desc">{agent.description}</div>
        <div className="gpt-author">Por Academia CABSA</div>
      </div>
    </a>
  );
}
