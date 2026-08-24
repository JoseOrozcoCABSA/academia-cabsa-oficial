import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, BarChart3, CalendarDays, Download, Eye, Flame, GraduationCap,
  Info, Lightbulb, Link2, MousePointerClick, RefreshCw, Search, Users,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Loader } from '@/components/common';
import { trackersService } from '@/services/trackersService';
import {
  Breakdown, DailyChart, DataTable, ErrorOrLoader, Filters, Insight, Metrics, Panel,
  PeriodSummary, ScholarshipUsage, TrackerHeader, TrackerNav, dateTime, exportCsv,
  number, percent, statusLabel, statusTone, useTracker,
} from './TrackerComponents';
import './trackers-dashboard.css';

export function AiTrackerPage() {
  const extra = useMemo(() => ({ scholarshipLevel: '', area: '', level: '', event: '' }), []);
  const tracker = useTracker('ai', extra);
  const data = tracker.data || {};
  const stats = data.stats || {};
  const assistantAgents = (data.topAgents || []).filter((item) => item.area === 'asistente');
  const tutorAgents = (data.topAgents || []).filter((item) => item.area === 'tutor');
  const assistantLeader = assistantAgents[0];
  const tutorLeader = tutorAgents[0];
  const toolColumns = [
    { key: 'agent_title', label: 'Herramienta', render: (row) => <div><strong>{row.agent_title || row.agent_key}</strong><small>{row.level_slug}</small></div> },
    { key: 'impressions', label: 'Vistas' },
    { key: 'clicks', label: 'Clics' },
    { key: 'ctr', label: 'Conversión', render: (row) => `${number(percent(row.clicks, row.impressions), 1)}%` },
    { key: 'people', label: 'Sesiones' },
  ];
  return <div className="page admin-page tracker-page">
    <TrackerHeader eyebrow="Analítica de inteligencia artificial" title="Uso de asistentes y tutores" description="Mide qué herramientas se muestran, cuáles reciben clics y cuántas sesiones interactúan con ellas." onRefresh={tracker.load}
      actions={<Button variant="secondary" onClick={() => exportCsv('cabsa-asistentes-agentes.csv', data.topAgents || [])}><Download /> Exportar ranking</Button>} />
    <Filters draft={tracker.draft} setDraft={tracker.setDraft} onSubmit={tracker.apply} onClear={tracker.clear}>
      <label><span>Área</span><select value={tracker.draft.area} onChange={(event) => tracker.setDraft({ ...tracker.draft, area: event.target.value })}><option value="">Todas</option><option value="asistente">Asistentes</option><option value="tutor">Tutores</option><option value="pagina">Páginas</option></select></label>
      <label><span>Nivel</span><select value={tracker.draft.level} onChange={(event) => tracker.setDraft({ ...tracker.draft, level: event.target.value })}><option value="">Todos</option><option value="preescolar">Preescolar</option><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option></select></label>
      <label><span>Evento</span><select value={tracker.draft.event} onChange={(event) => tracker.setDraft({ ...tracker.draft, event: event.target.value })}><option value="">Todos</option><option value="page_view">Visita</option><option value="impression">Impresión</option><option value="click">Clic</option></select></label>
    </Filters>
    <ErrorOrLoader error={tracker.error} loading={tracker.loading}>{<>
      <PeriodSummary period={data.period} />
      <Metrics items={[
        { label: 'Interacciones registradas', value: number(stats.events), hint: 'Suma de visitas, impresiones y clics', definition: 'Cada acción registrada cuenta como un evento.', icon: Activity },
        { label: 'Sesiones alcanzadas', value: number(stats.people), hint: 'Visitantes aproximados, no cuentas únicas', definition: 'Una misma persona puede iniciar más de una sesión.', icon: Users, tone: 'green' },
        { label: 'Clics en herramientas', value: number(stats.clicks), hint: `${number(stats.ctr, 1)}% de conversión de vista a clic`, definition: 'CTR = clics divididos entre tarjetas mostradas.', icon: MousePointerClick, tone: 'gold' },
        { label: 'Tarjetas mostradas', value: number(stats.impressions), hint: `${number(stats.clicks_per_person, 1)} clics por sesión`, definition: 'Cuenta cada vez que una tarjeta fue visible.', icon: Eye, tone: 'blue' },
      ]} />
      <ScholarshipUsage rows={data.byScholarship} selected={tracker.filters.scholarshipLevel} />
      <Insight tone={Number(stats.ctr) >= 20 ? 'positive' : 'attention'}>
        De cada 100 tarjetas mostradas, aproximadamente <strong>{number(stats.ctr, 1)}</strong> reciben un clic. Usa el ranking para identificar qué asistentes generan interés y cuáles necesitan un título o enlace más claro.
      </Insight>
      <div className="tracker-leader-grid">
        <Card className="tracker-leader-card"><span>Asistente más utilizado</span><strong>{assistantLeader?.agent_title || assistantLeader?.agent_key || 'Sin uso registrado'}</strong><p>{number(assistantLeader?.clicks)} clics · {number(assistantLeader?.impressions)} vistas · {number(assistantLeader?.people)} sesiones</p></Card>
        <Card className="tracker-leader-card"><span>Tutor más utilizado</span><strong>{tutorLeader?.agent_title || tutorLeader?.agent_key || 'Sin uso registrado'}</strong><p>{number(tutorLeader?.clicks)} clics · {number(tutorLeader?.impressions)} vistas · {number(tutorLeader?.people)} sesiones</p></Card>
      </div>
      <div className="tracker-two-columns">
        <Panel title="Asistentes más utilizados" description="Ranking exclusivo de asistentes, ordenado por clics y vistas."><DataTable rows={assistantAgents.slice(0, 15)} columns={toolColumns} empty="No se registró uso de asistentes con estos filtros." /></Panel>
        <Panel title="Tutores más utilizados" description="Ranking exclusivo de tutores, ordenado por clics y vistas."><DataTable rows={tutorAgents.slice(0, 15)} columns={toolColumns} empty="No se registró uso de tutores con estos filtros." /></Panel>
      </div>
      <div className="tracker-two-columns"><DailyChart rows={data.daily || []} valueKey="events" label="Interacciones registradas" />
        <Panel title="Clics por proveedor" description="Destino elegido al abrir una herramienta."><Breakdown items={(data.byProvider || []).map((item) => ({ label: item.provider === 'chatgpt' ? 'ChatGPT' : item.provider === 'gemini' ? 'Gemini' : 'Sin proveedor identificado', value: item.clicks }))} /></Panel>
      </div>
      <Panel title="Ranking de asistentes y tutores" description="Ordenado por clics, vistas y sesiones. El porcentaje indica cuántas vistas terminan en clic." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-asistentes-ranking.csv', data.topAgents || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.topAgents || []} columns={[
          { key: 'agent_title', label: 'Herramienta', render: (row) => <div><strong>{row.agent_title || row.agent_key}</strong><small>{row.agent_key}</small></div> },
          { key: 'area', label: 'Tipo', render: (row) => <Badge tone={row.area === 'tutor' ? 'green' : 'gold'}>{row.area}</Badge> },
          { key: 'level_slug', label: 'Nivel' }, { key: 'impressions', label: 'Vistas' }, { key: 'clicks', label: 'Clics' },
          { key: 'ctr', label: 'Conversión', render: (row) => `${number(percent(row.clicks, row.impressions), 1)}%` },
          { key: 'people', label: 'Sesiones' }, { key: 'last_event', label: 'Actividad más reciente', render: (row) => dateTime(row.last_event) },
        ]} />
      </Panel>
      <div className="tracker-two-columns">
        <Panel title="Resumen por área" description="Compara asistentes, tutores y páginas."><DataTable rows={data.byArea || []} columns={[{ key: 'area', label: 'Área' }, { key: 'events', label: 'Eventos' }, { key: 'impressions', label: 'Vistas' }, { key: 'clicks', label: 'Clics' }, { key: 'people', label: 'Sesiones' }]} /></Panel>
        <Panel title="Resumen por nivel educativo" description="Permite detectar dónde existe mayor uso."><DataTable rows={data.byLevel || []} columns={[{ key: 'level', label: 'Nivel' }, { key: 'events', label: 'Eventos' }, { key: 'impressions', label: 'Vistas' }, { key: 'clicks', label: 'Clics' }, { key: 'people', label: 'Sesiones' }]} /></Panel>
      </div>
      <Panel title="Detalle de actividad reciente" description="Últimos 60 eventos dentro del periodo seleccionado." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-asistentes-eventos.csv', data.recent || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.recent || []} columns={[
          { key: 'created_at', label: 'Fecha y hora', render: (row) => dateTime(row.created_at) },
          { key: 'display_name', label: 'Persona o sesión', render: (row) => <div><strong>{row.display_name}</strong><small>{row.email}</small></div> },
          { key: 'event_type', label: 'Acción', render: (row) => <Badge tone={statusTone(row.event_type)}>{statusLabel(row.event_type)}</Badge> },
          { key: 'agent_title', label: 'Herramienta' }, { key: 'level_slug', label: 'Nivel' }, { key: 'provider', label: 'Proveedor' }, { key: 'device', label: 'Dispositivo' },
        ]} />
      </Panel>
    </>}</ErrorOrLoader>
  </div>;
}

export function CapsuleTrackerPage() {
  const extra = useMemo(() => ({ scholarshipLevel: '', user: '' }), []);
  const tracker = useTracker('capsules', extra);
  const data = tracker.data || {};
  const stats = data.stats || {};
  const supportRate = percent(Number(stats.yellow || 0) + Number(stats.red || 0), stats.progress);
  return <div className="page admin-page tracker-page">
    <TrackerHeader eyebrow="Analítica de aprendizaje continuo" title="Rachas y cápsulas" description="Explica la constancia de uso y cómo califican los alumnos su comprensión en cada cápsula." onRefresh={tracker.load}
      actions={<Button variant="secondary" onClick={() => exportCsv('cabsa-rachas.csv', data.streaks || [])}><Download /> Exportar rachas</Button>} />
    <Filters draft={tracker.draft} setDraft={tracker.setDraft} onSubmit={tracker.apply} onClear={tracker.clear}>
      <label className="tracker-user-filter"><span>Buscar usuario</span><div><Search /><input value={tracker.draft.user} onChange={(event) => tracker.setDraft({ ...tracker.draft, user: event.target.value })} placeholder="Nombre, usuario o correo" /></div></label>
    </Filters>
    <ErrorOrLoader error={tracker.error} loading={tracker.loading}>{<>
      <PeriodSummary period={data.period} />
      <Metrics items={[
        { label: 'Alumnos con evaluación', value: number(stats.users), hint: 'Registraron al menos un semáforo', definition: 'Cuenta usuarios distintos con avance en cápsulas.', icon: Users },
        { label: 'Evaluaciones de cápsulas', value: number(stats.progress), hint: `${number(percent(stats.green, stats.progress), 1)}% marcadas como comprendidas`, definition: 'Una evaluación es la selección verde, amarilla o roja.', icon: Activity, tone: 'green' },
        { label: 'Registros de actividad', value: number(stats.visits), hint: `Distribuidos en ${number(stats.active_days)} registros diarios`, definition: 'Suma las actividades guardadas por alumno y fecha.', icon: CalendarDays, tone: 'blue' },
        { label: 'Mejor racha', value: `${number(stats.best_streak)} días`, hint: `${number(stats.average_streak, 1)} días de racha actual promedio`, definition: 'Días consecutivos con actividad de aprendizaje.', icon: Flame, tone: 'gold' },
        { label: 'Cápsulas utilizadas', value: `${number(stats.used_capsules)} de ${number(stats.total_capsules)}`, hint: `${number(stats.unused_capsules)} sin evaluaciones en el periodo`, definition: 'Una cápsula se considera utilizada cuando un alumno registra su semáforo.', icon: Eye, tone: 'blue' },
      ]} />
      <ScholarshipUsage rows={data.byScholarship} selected={tracker.filters.scholarshipLevel} interactionLabel="evaluaciones" />
      <Insight tone={supportRate > 30 ? 'attention' : 'positive'}>
        El <strong>{number(supportRate, 1)}%</strong> de las evaluaciones indica “reforzar” o “necesita apoyo”. Revisa las cápsulas con más amarillos y rojos para priorizar mejoras de contenido.
      </Insight>
      <div className="tracker-two-columns"><DailyChart rows={data.daily || []} valueKey="visits" label="Actividades de aprendizaje" />
        <Panel title="Comprensión declarada" description="Resultado de los semáforos elegidos por los alumnos."><div className="tracker-semaphores">
          <div className="green"><strong>{number(stats.green)}</strong><span>Comprendido</span><small>{number(percent(stats.green, stats.progress), 1)}%</small></div>
          <div className="yellow"><strong>{number(stats.yellow)}</strong><span>Reforzar</span><small>{number(percent(stats.yellow, stats.progress), 1)}%</small></div>
          <div className="red"><strong>{number(stats.red)}</strong><span>Necesita apoyo</span><small>{number(percent(stats.red, stats.progress), 1)}%</small></div>
        </div></Panel>
      </div>
      <Panel title="Cápsulas más utilizadas por estudiantes" description="Ordenadas desde la mayor cantidad de evaluaciones registradas." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-capsulas.csv', data.capsuleRows || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.topCapsules || []} columns={[
          { key: 'title', label: 'Cápsula', render: (row) => <div><strong>{row.title}</strong><small>ID {row.capsule_id}</small></div> },
          { key: 'responses', label: 'Evaluaciones' }, { key: 'green', label: 'Comprendido' }, { key: 'yellow', label: 'Reforzar' }, { key: 'red', label: 'Apoyo' },
          { key: 'support', label: 'Requiere atención', render: (row) => `${number(percent(Number(row.yellow) + Number(row.red), row.responses), 1)}%` },
          { key: 'last_activity', label: 'Actividad más reciente', render: (row) => dateTime(row.last_activity) },
        ]} />
      </Panel>
      <Panel title="Cápsulas menos utilizadas o sin uso" description="Permite localizar contenido publicado que necesita promoción, revisión o mejor ubicación.">
        <DataTable rows={data.leastUsedCapsules || []} columns={[
          { key: 'title', label: 'Cápsula', render: (row) => <div><strong>{row.title}</strong><small>{row.category || `ID ${row.capsule_id}`}</small></div> },
          { key: 'usage', label: 'Estado', render: (row) => <Badge tone={Number(row.responses) ? 'gold' : 'neutral'}>{Number(row.responses) ? 'Uso bajo' : 'Sin uso'}</Badge> },
          { key: 'responses', label: 'Evaluaciones' }, { key: 'green', label: 'Comprendido' }, { key: 'yellow', label: 'Reforzar' }, { key: 'red', label: 'Apoyo' },
          { key: 'last_activity', label: 'Última actividad', render: (row) => dateTime(row.last_activity) },
        ]} />
      </Panel>
      <div className="tracker-two-columns">
        <Panel title="Alumnos con más evaluaciones" description="Actividad en cápsulas y resultado de comprensión."><DataTable rows={data.topUsers || []} columns={[
          { key: 'display_name', label: 'Alumno', render: (row) => <div><strong>{row.display_name}</strong><small>{row.email}</small></div> },
          { key: 'capsules', label: 'Evaluaciones' }, { key: 'green', label: 'Comprendidas' },
          { key: 'current_streak', label: 'Racha actual / mejor', render: (row) => `${number(row.current_streak)} / ${number(row.best_streak)} días` },
        ]} /></Panel>
        <Panel title="Rachas destacadas" description="Continuidad actual, récord y días activos acumulados."><DataTable rows={data.streaks || []} columns={[
          { key: 'display_name', label: 'Alumno' }, { key: 'current_streak', label: 'Actual' }, { key: 'best_streak', label: 'Récord' }, { key: 'total_days', label: 'Días activos' },
        ]} /></Panel>
      </div>
      <Panel title="Evaluaciones recientes" description="Últimas 60 selecciones de semáforo del periodo." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-avances-capsulas.csv', data.recent || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.recent || []} columns={[
          { key: 'activity_at', label: 'Fecha y hora', render: (row) => dateTime(row.activity_at) },
          { key: 'display_name', label: 'Alumno', render: (row) => <div><strong>{row.display_name || 'Usuario'}</strong><small>{row.email}</small></div> },
          { key: 'title', label: 'Cápsula' }, { key: 'status', label: 'Comprensión', render: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge> },
        ]} />
      </Panel>
    </>}</ErrorOrLoader>
  </div>;
}

export function CourseTrackerPage() {
  const extra = useMemo(() => ({ scholarshipLevel: '', courseId: '', user: '' }), []);
  const tracker = useTracker('courses', extra);
  const data = tracker.data || {};
  const stats = data.stats || {};
  const courseCompletion = percent(stats.completed_courses, stats.participations);
  const lessonCompletion = percent(stats.completed_lessons, stats.lesson_activity);
  const mostVisitedCourse = (data.courseRows || []).find((course) => Number(course.page_views) > 0);
  return <div className="page admin-page tracker-page">
    <TrackerHeader eyebrow="Analítica de formación" title="Cursos y lecciones" description="Muestra alcance, participación y avance para localizar cursos activos y posibles abandonos." onRefresh={tracker.load}
      actions={<Button variant="secondary" onClick={() => exportCsv('cabsa-cursos.csv', data.courseRows || [])}><Download /> Exportar cursos</Button>} />
    <Filters draft={tracker.draft} setDraft={tracker.setDraft} onSubmit={tracker.apply} onClear={tracker.clear}>
      <label><span>Curso</span><select value={tracker.draft.courseId} onChange={(event) => tracker.setDraft({ ...tracker.draft, courseId: event.target.value })}><option value="">Todos los cursos</option>{(data.courses || []).map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>
      <label className="tracker-user-filter"><span>Buscar alumno</span><div><Search /><input value={tracker.draft.user} onChange={(event) => tracker.setDraft({ ...tracker.draft, user: event.target.value })} placeholder="Nombre, usuario o correo" /></div></label>
    </Filters>
    <ErrorOrLoader error={tracker.error} loading={tracker.loading}>{<>
      <PeriodSummary period={data.period} />
      <Metrics items={[
        { label: 'Oferta publicada', value: `${number(stats.courses)} cursos`, hint: `${number(stats.lessons)} lecciones disponibles`, definition: 'Catálogo publicado; no depende de la actividad del periodo.', icon: GraduationCap },
        { label: 'Alumnos activos', value: number(stats.active_users), hint: 'Con inscripción o avance en el periodo', definition: 'Cuenta alumnos distintos con algún movimiento.', icon: Users, tone: 'green' },
        { label: 'Inscripciones activas', value: number(stats.participations), hint: `${number(courseCompletion, 1)}% finalizaron el curso`, definition: 'Un alumno puede tener más de una inscripción.', icon: Link2, tone: 'gold' },
        { label: 'Movimientos en lecciones', value: number(stats.lesson_activity), hint: `${number(lessonCompletion, 1)}% terminaron en completado`, definition: 'Registros de avance actualizados dentro del periodo.', icon: Activity, tone: 'blue' },
        { label: 'Cursos utilizados', value: `${number(stats.used_courses)} de ${number(stats.courses)}`, hint: 'Con visitas o alumnos inscritos', definition: 'Combina vistas de la página del curso con inscripciones del periodo.', icon: Eye, tone: 'green' },
        { label: 'Cursos sin uso', value: number(stats.unused_courses), hint: `${number(stats.course_page_views)} vistas totales de cursos`, definition: 'Cursos publicados sin vistas ni alumnos durante el periodo.', icon: Info, tone: 'gold' },
      ]} />
      <ScholarshipUsage rows={data.byScholarship} selected={tracker.filters.scholarshipLevel} interactionLabel="movimientos en lecciones" />
      <Insight tone={courseCompletion >= 50 ? 'positive' : 'attention'}>
        La finalización de cursos en este periodo es de <strong>{number(courseCompletion, 1)}%</strong>. {mostVisitedCourse ? <>El curso más visitado es <strong>{mostVisitedCourse.title}</strong> con {number(mostVisitedCourse.page_views)} vistas.</> : 'Todavía no existen visitas registradas a páginas de cursos en este periodo.'}
      </Insight>
      <DailyChart rows={data.daily || []} valueKey="movements" label="Cambios de avance en lecciones" />
      <Panel title="Cursos más visitados, utilizados y sin uso" description="Incluye todo el catálogo publicado; se ordena por vistas y después por alumnos." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-cursos-uso.csv', data.courseRows || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.courseRows || []} columns={[
          { key: 'title', label: 'Curso', render: (row) => <div><strong>{row.title}</strong><small>ID {row.course_id}</small></div> },
          { key: 'usage_status', label: 'Uso', render: (row) => <Badge tone={row.usage_status === 'USED' ? 'green' : 'neutral'}>{row.usage_status === 'USED' ? 'Utilizado' : 'Sin uso'}</Badge> },
          { key: 'page_views', label: 'Vistas' }, { key: 'visitors', label: 'Visitantes' },
          { key: 'students', label: 'Alumnos' }, { key: 'completed', label: 'Finalizados' }, { key: 'in_progress', label: 'En progreso' },
          { key: 'completion', label: 'Finalización', render: (row) => `${number(percent(row.completed, row.students), 1)}%` },
          { key: 'average_progress', label: 'Avance promedio', render: (row) => <div className="tracker-progress"><i style={{ width: `${Math.min(100, Number(row.average_progress || 0))}%` }} /><span>{number(row.average_progress, 1)}%</span></div> },
          { key: 'last_activity', label: 'Actividad más reciente', render: (row) => dateTime(row.last_activity) },
        ]} />
      </Panel>
      <Panel title="Lecciones con actividad" description="Lecciones que recibieron avances en el periodo, ordenadas por alcance."><DataTable rows={data.lessonRows || []} columns={[
        { key: 'title', label: 'Lección', render: (row) => <div><strong>{row.title}</strong><small>{row.course_title}</small></div> },
        { key: 'students', label: 'Alumnos' }, { key: 'completed', label: 'Completadas' }, { key: 'in_progress', label: 'En progreso' },
        { key: 'completion', label: 'Finalización', render: (row) => `${number(percent(row.completed, row.students), 1)}%` },
        { key: 'last_activity', label: 'Actividad más reciente', render: (row) => dateTime(row.last_activity) },
      ]} /></Panel>
      <div className="tracker-two-columns">
        <Panel title="Actividad por alumno" description="Número de cursos y lecciones con movimiento."><DataTable rows={data.userRows || []} columns={[
          { key: 'display_name', label: 'Alumno', render: (row) => <div><strong>{row.display_name}</strong><small>{row.email}</small></div> },
          { key: 'courses', label: 'Cursos' }, { key: 'lessons', label: 'Lecciones' }, { key: 'completed', label: 'Completadas' },
        ]} /></Panel>
        <Panel title="Resumen de conversión" description="Relación entre participación y finalización."><Breakdown items={[
          { label: 'Inscripciones', value: stats.participations },
          { label: 'Cursos finalizados', value: stats.completed_courses },
          { label: 'Lecciones completadas', value: stats.completed_lessons },
        ]} /><div className="tracker-formulas"><span>Finalización de cursos <strong>{number(courseCompletion, 1)}%</strong></span><span>Finalización de lecciones <strong>{number(lessonCompletion, 1)}%</strong></span></div></Panel>
      </div>
      <Panel title="Detalle de actividad reciente" description="Últimos 60 movimientos de lecciones dentro del periodo." action={<Button variant="secondary" onClick={() => exportCsv('cabsa-cursos-actividad.csv', data.recent || [])}><Download /> CSV</Button>}>
        <DataTable rows={data.recent || []} columns={[
          { key: 'activity_at', label: 'Fecha y hora', render: (row) => dateTime(row.activity_at) },
          { key: 'display_name', label: 'Alumno', render: (row) => <div><strong>{row.display_name}</strong><small>{row.email}</small></div> },
          { key: 'course_title', label: 'Curso' }, { key: 'lesson_title', label: 'Lección' },
          { key: 'status', label: 'Estado', render: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge> },
          { key: 'progress_percent', label: 'Avance', render: (row) => `${number(row.progress_percent, 1)}%` },
        ]} />
      </Panel>
    </>}</ErrorOrLoader>
  </div>;
}
