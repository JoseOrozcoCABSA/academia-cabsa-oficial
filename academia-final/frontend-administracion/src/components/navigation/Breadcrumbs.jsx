/**
 * @file Componente `Breadcrumbs`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { useLocation } from 'react-router-dom';
const names = { academia:'Academia', contenido:'Contenido', ia:'Inteligencia artificial', analitica:'Analítica', usuarios:'Usuarios', notificaciones:'Notificaciones', configuracion:'Configuración' };
/**
 * Migas de pan de un solo nivel.
 *
 * Solo mira el **primer** segmento de la ruta, asi que una pantalla anidada
 * muestra la misma miga que su seccion: no refleja la profundidad real.
 */
export default function Breadcrumbs(){const key=useLocation().pathname.split('/').filter(Boolean)[0];return <div className="breadcrumbs"><span>Administración</span><b>/</b><strong>{names[key]||'Centro de control'}</strong></div>}
