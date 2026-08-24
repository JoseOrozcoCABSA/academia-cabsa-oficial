import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { ConfirmDialog, Loader, Modal } from '@/components/common';
import { profileService } from '@/services/profileService';
import '@/profile-cabsa.css';
import '@/teacher-students.css';

const EMPTY_STUDENT = { fullName: '', email: '', username: '', password: '', passwordConfirmation: '' };
const EMPTY_EDIT = { id: '', fullName: '', email: '', username: '', newPassword: '', passwordConfirmation: '' };
const HISTORY_LABELS = {
  ADDED: 'Alumno agregado', REMOVED: 'Eliminado del grupo', RESTORED: 'Reincorporado al grupo',
  PROFILE_UPDATED: 'Datos editados', PASSWORD_RESET: 'Contraseña restablecida',
};

const formatDate = (value, fallback = 'No disponible') => {
  if (!value || String(value).startsWith('1900-01-01')) return fallback;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

export default function TeacherStudentsPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [student, setStudent] = useState(EMPTY_STUDENT);
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [saving, setSaving] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const load = useCallback(async (groupId) => {
    setLoading(true);
    try {
      setOverview(await profileService.getManagedGroup(groupId));
      setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Mis alumnos — Academia CABSA';
    return () => { document.title = previous; };
  }, []);

  const group = useMemo(() => overview?.groups?.find(
    (item) => Number(item.id) === Number(overview.selectedGroupId),
  ) || null, [overview]);
  const dependentLabel = overview?.dependentLabel || 'Alumno';
  const dependentsLabel = `${dependentLabel}s`;
  const dependentMembership = overview?.dependentMembership || 'Beca Familia-Estudiante';

  const run = async (key, action, success) => {
    setSaving(key); setError('');
    try { const result = await action(); setNotice(result.message || success); await load(group?.id); return true; }
    catch (requestError) { setError(requestError.message); return false; }
    finally { setSaving(''); }
  };

  const createStudent = async (event) => {
    event.preventDefault();
    const created = await run('create', () => profileService.createStudent({ ...student, groupId: group.id }), 'La cuenta fue creada y agregada al grupo.');
    if (created) setStudent(EMPTY_STUDENT);
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    const current = edit;
    const updated = await run(current.id, () => profileService.updateManagedStudent(current.id, { ...current, groupId: group.id }), 'Los datos del alumno fueron actualizados.');
    if (updated) setEdit(null);
  };
  const confirmRemove = async () => {
    const current = remove; setRemove(null);
    await run(current.id, () => profileService.removeStudentFromGroup(current.id, group.id), 'El alumno fue retirado del grupo.');
  };
  const exportHistory = () => {
    if (!group?.history?.length) return;
    const escaped = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const columns = ['Fecha', 'Alumno', 'Correo', 'Movimiento', 'Estado anterior', 'Estado nuevo', 'Realizado por'];
    const rows = group.history.map((entry) => [entry.created_at, entry.student_name, entry.student_email, entry.event_type, entry.previous_status, entry.new_status, entry.performed_by].map(escaped).join(','));
    const url = URL.createObjectURL(new Blob([`\uFEFF${columns.map(escaped).join(',')}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `historial-grupo-${group.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  const editStudent = (item) => setEdit({ ...EMPTY_EDIT, id: item.id, fullName: item.display_name || '', email: item.email || '', username: item.username || '' });

  return <div className="profile-cabsa-public teacher-students-public">
    <a className="skip-link" href="#contenido">Saltar al contenido principal</a><Header />
    <main id="contenido"><section className="profile-cabsa-page teacher-students-page">
      <nav className="teacher-students-breadcrumb" aria-label="Navegación secundaria"><Link to="/perfil">Mi cuenta</Link><span>/</span><strong>Mis dependientes</strong></nav>
      <header className="profile-cabsa-hero teacher-students-hero">
        <div><p className="eyebrow">Panel de seguimiento</p><h1>Mis {dependentsLabel.toLowerCase()}</h1><p>Administra las cuentas dependientes incluidas en tu beca y consulta su avance cuando el perfil lo permita.</p></div>
        {group && <div className="profile-seat-counter"><strong>{group.availableSeats}</strong><span>de {group.seatLimit} lugares disponibles</span></div>}
      </header>
      {notice && <div className="profile-cabsa-message" role="status">{notice}</div>}
      {error && <div className="profile-cabsa-alert" role="alert">{error}</div>}
      {loading ? <div className="profile-cabsa-state"><Loader label="Cargando alumnos" /></div> : !overview?.canManage ?
        <section className="profile-cabsa-card teacher-empty"><h2>Tu beca no incluye dependientes</h2><p>Este perfil no tiene una regla activa de cuentas asociadas.</p><Link className="profile-cabsa-button" to="/perfil">Volver a mi cuenta</Link></section> : <>
        {overview.groups.length > 1 && <label className="profile-group-selector">Grupo a administrar<select value={overview.selectedGroupId || ''} onChange={(event) => load(event.target.value)}>{overview.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {!group && <section className="profile-cabsa-card teacher-empty"><h2>No hay grupos disponibles</h2><p>Solicita que se asigne un grupo a tu cuenta docente.</p></section>}
        {group && <section className="profile-cabsa-card profile-group-card">
          <header className="profile-group-heading"><div><p className="eyebrow">{group.name}</p><h2>Administración del grupo</h2><p>{group.description || 'Cuentas bajo seguimiento del docente.'}</p></div></header>
          <div className="profile-group-layout">
            <form className="profile-student-form" onSubmit={createStudent}>
              <h3>Crear cuenta de {dependentLabel.toLowerCase()}</h3><p>La persona podrá iniciar sesión inmediatamente y recibirá {dependentMembership} con la vigencia definida para tu beca.</p>
              <label>Nombre completo<input required value={student.fullName} onChange={(event) => setStudent({ ...student, fullName: event.target.value })} /></label>
              <label>Correo<input type="email" required value={student.email} onChange={(event) => setStudent({ ...student, email: event.target.value })} /></label>
              <label>Usuario<input required pattern="[A-Za-z0-9._-]{3,100}" value={student.username} onChange={(event) => setStudent({ ...student, username: event.target.value })} /></label>
              <div className="profile-password-grid">
                <label>Contraseña<input type="password" minLength="8" required value={student.password} onChange={(event) => setStudent({ ...student, password: event.target.value })} /></label>
                <label>Confirmar<input type="password" minLength="8" required value={student.passwordConfirmation} onChange={(event) => setStudent({ ...student, passwordConfirmation: event.target.value })} /></label>
              </div>
              <button className="profile-cabsa-button" disabled={saving === 'create' || group.availableSeats < 1}>{saving === 'create' ? 'Creando…' : group.availableSeats < 1 ? 'Sin lugares disponibles' : 'Crear cuenta'}</button>
            </form>
            <div className="profile-student-list"><h3>{dependentsLabel} registrados ({group.students.length})</h3>
              {!group.students.length ? <p>Aún no hay cuentas dependientes en este grupo.</p> : group.students.map((item) => <article className="profile-student-card" key={item.id}>
                <header><div><strong>{item.display_name}</strong><span>{item.email}</span><small>{Number(item.scholarship_active) ? `${dependentMembership} · vence ${formatDate(item.scholarship_expires, 'sin fecha límite')}` : `Sin ${dependentMembership} activa`}</small></div><span className={`profile-status profile-status--${String(item.status).toLowerCase()}`}>{item.status}</span></header>
                <div className="profile-student-metrics"><span><strong>{item.courses}</strong> cursos</span><span><strong>{item.course_progress}%</strong> avance</span><span><strong>{item.capsules}</strong> cápsulas</span><span className="profile-semaphore-summary"><i className="green">{item.green_capsules}</i><i className="yellow">{item.yellow_capsules}</i><i className="red">{item.red_capsules}</i></span></div>
                <footer><small>Última actividad: {formatDate(item.last_activity, 'Sin actividad')}</small><div className="profile-student-actions">
                  {overview.progressEnabled && <Link className="student-progress-link" to={`/mis-alumnos/${item.id}?groupId=${group.id}`}>Ver progreso</Link>}
                  <button type="button" className="edit" onClick={() => editStudent(item)}>Editar datos</button>
                  {item.source === 'DOCENTE' && <>{!Number(item.scholarship_active) && <button type="button" className="scholarship" disabled={saving === item.id} onClick={() => run(item.id, () => profileService.assignStudentScholarship(item.id, group.id), 'Beca asignada correctamente.')}>Asignar beca</button>}<button type="button" disabled={saving === item.id} onClick={() => run(item.id, () => profileService.updateStudentStatus(item.id, group.id, item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'), item.status === 'ACTIVE' ? 'Acceso suspendido.' : 'Acceso reactivado.')}>{item.status === 'ACTIVE' ? 'Suspender acceso' : 'Reactivar acceso'}</button></>}
                  <button type="button" className="remove" disabled={saving === item.id} onClick={() => setRemove(item)}>Eliminar del grupo</button>
                </div></footer>
              </article>)}</div>
          </div>
          <details className="profile-group-history"><summary><span>Historial y respaldo del grupo</span><strong>{group.history?.length || 0} movimientos</strong></summary>
            <div className="profile-history-tools"><p>Las bajas no eliminan cuentas, becas ni avances.</p><button type="button" disabled={!group.history?.length} onClick={exportHistory}>Descargar respaldo CSV</button></div>
            {group.history?.length ? <div className="profile-history-list">{group.history.map((entry, index) => {
              const latest = group.history.findIndex((item) => item.student_user_id === entry.student_user_id) === index;
              const label = entry.event_type === 'STATUS_CHANGED' ? (entry.new_status === 'SUSPENDED' ? 'Acceso suspendido' : 'Acceso reactivado') : HISTORY_LABELS[entry.event_type] || entry.event_type;
              return <article key={entry.id} className={`profile-history-entry profile-history-entry--${entry.event_type.toLowerCase()}`}><div><strong>{entry.student_name}</strong><span>{entry.student_email}</span></div><div><b>{label}</b><small>{formatDate(entry.created_at)} · por {entry.performed_by}</small></div>{entry.event_type === 'REMOVED' && entry.current_group_status === 'REMOVED' && latest && <button type="button" disabled={saving === entry.student_user_id || group.availableSeats < 1} onClick={() => run(entry.student_user_id, () => profileService.restoreStudentToGroup(entry.student_user_id, group.id), 'Alumno reincorporado.')}>{group.availableSeats < 1 ? 'Grupo sin lugares' : 'Reincorporar'}</button>}</article>;
            })}</div> : <p>Aún no existen movimientos registrados.</p>}
          </details>
        </section>}
        {group?.students?.length > 0 && <section className="profile-cabsa-card student-comparison-section">
          <header><div><p className="eyebrow">Vista del grupo</p><h2>Comparativa general</h2><p>Compara el avance esencial de todos los integrantes sin abrir cada informe individual.</p></div><button type="button" className="profile-cabsa-button profile-cabsa-button--secondary" onClick={() => setShowComparison((value) => !value)}>{showComparison ? 'Ocultar comparativa' : 'Ver comparativa'}</button></header>
          {showComparison && <div className="student-comparison-table"><table><thead><tr><th>Alumno</th><th>Cursos</th><th>Avance</th><th>Lecciones</th><th>Cápsulas</th><th>Foros</th><th>Última actividad</th></tr></thead><tbody>{[...group.students].sort((left, right) => Number(right.course_progress) - Number(left.course_progress) || Number(right.completed_lessons) - Number(left.completed_lessons)).map((item) => <tr key={item.id}><td><strong>{item.display_name}</strong><small>{item.email}</small></td><td>{item.completed_courses}/{item.courses}</td><td><b>{item.course_progress}%</b></td><td>{item.completed_lessons}/{item.lessons}</td><td>{item.capsules}</td><td>{Number(item.forum_contributions) ? `Sí (${item.forum_contributions})` : 'No'}</td><td>{formatDate(item.last_activity, 'Sin actividad')}</td></tr>)}</tbody></table></div>}
        </section>}
      </>}
    </section></main>
    <ConfirmDialog open={Boolean(remove)} title="Eliminar alumno del grupo" message={`¿Retirar a “${remove?.display_name || ''}” del grupo? Su cuenta, beca, cursos y avances permanecerán guardados.`} confirmLabel="Eliminar del grupo" onClose={() => setRemove(null)} onConfirm={confirmRemove} />
    <Modal open={Boolean(edit)} title="Editar alumno" onClose={() => !saving && setEdit(null)}>{edit && <form className="profile-student-edit-form" onSubmit={saveEdit}>
      <p>Edita sus datos de acceso. La contraseña actual nunca se muestra.</p>
      <label>Nombre completo<input required value={edit.fullName} onChange={(event) => setEdit({ ...edit, fullName: event.target.value })} /></label>
      <label>Correo<input type="email" required value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} /></label>
      <label>Usuario<input required pattern="[A-Za-z0-9._-]{3,100}" value={edit.username} onChange={(event) => setEdit({ ...edit, username: event.target.value })} /></label>
      <div className="profile-password-grid"><label>Nueva contraseña<input type="password" minLength="10" autoComplete="new-password" value={edit.newPassword} onChange={(event) => setEdit({ ...edit, newPassword: event.target.value })} placeholder="Dejar vacío para conservarla" /></label><label>Confirmar contraseña<input type="password" minLength="10" autoComplete="new-password" value={edit.passwordConfirmation} onChange={(event) => setEdit({ ...edit, passwordConfirmation: event.target.value })} /></label></div>
      <div className="modal-actions"><button type="button" className="profile-cabsa-button profile-cabsa-button--secondary" onClick={() => setEdit(null)}>Cancelar</button><button className="profile-cabsa-button" disabled={Boolean(saving)}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>}</Modal>
    <Footer />
  </div>;
}
