/**
 * @file Componente `ProgressPage`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Award, BookOpen, CalendarDays, Flame } from 'lucide-react';
import { Card } from '@/components/common';
import { courses } from '@/data/referenceCatalog';
/**
 * Indice de seguimiento personal.
 *
 * Solo enlaza a las pantallas de progreso; los datos se cargan en cada una.
 */
export default function ProgressPage() {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Seguimiento personal</p><h1>Mi progreso</h1><p>Consulta tu avance, actividad y logros académicos.</p></div></div><section className="metric-grid"><Card><span className="metric-icon red"><BookOpen /></span><div><small>Avance general</small><strong>38%</strong><p>12 de 32 lecciones</p></div></Card><Card><span className="metric-icon gold"><Flame /></span><div><small>Racha actual</small><strong>6 días</strong><p>Continúa mañana</p></div></Card><Card><span className="metric-icon green"><Award /></span><div><small>Certificados</small><strong>1</strong><p>2 próximos</p></div></Card></section><div className="detail-grid"><Card><h2>Avance por curso</h2><div className="progress-list">{courses.slice(0,4).map((course) => <div key={course.id}><span><strong>{course.title}</strong><small>{course.progress}% completado</small></span><div className="progress"><i style={{width: `${course.progress}%`}} /></div></div>)}</div></Card><Card><h2><CalendarDays /> Actividad reciente</h2><ul className="timeline-list"><li><b>Hoy</b><span>Lección completada · Bootcamp Docente</span></li><li><b>Ayer</b><span>Cápsula consultada · Seguridad en redes</span></li><li><b>24 jul</b><span>Conversación con Asistente de Primaria</span></li></ul></Card></div></div>;
}
