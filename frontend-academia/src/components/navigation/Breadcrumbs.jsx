/**
 * @file Componente `Breadcrumbs`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { useLocation } from 'react-router-dom';
const labels = { cursos: 'Cursos', mediateca: 'Mediateca', asistentes: 'Asistentes IA', progreso: 'Progreso', certificados: 'Certificados', soporte: 'Soporte', perfil: 'Perfil' };
/**
 * Migas de pan de un solo nivel.
 *
 * Solo mira el **primer** segmento de la ruta, asi que una pantalla anidada
 * muestra la misma miga que su seccion: no refleja la profundidad real. Un
 * segmento sin etiqueta en el mapa se muestra como «Inicio».
 */
export default function Breadcrumbs() {
  const segment = useLocation().pathname.split('/').filter(Boolean)[0];
  return <div className="breadcrumbs"><span>Academia</span><b>/</b><strong>{labels[segment] || 'Inicio'}</strong></div>;
}
