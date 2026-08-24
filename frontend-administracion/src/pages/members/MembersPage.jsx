import { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Search, UserRoundCheck } from 'lucide-react';
import { Badge, Button, EmptyState, Loader, Modal } from '@/components/common';
import { scholarshipCodesService } from '@/services/scholarshipCodesService';
import { userDashboardService } from '@/services/userDashboardService';
import './members-page.css';

const blankPassword = { password: '', passwordConfirmation: '' };

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [overview, profiles] = await Promise.all([
        userDashboardService.overview(),
        scholarshipCodesService.profiles(),
      ]);
      setMembers((overview.accounts || []).filter((account) => account.modern_status === 'ACTIVE'));
      setLevels(profiles || []);
    } catch (error) {
      setNotice({ error: true, text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const visible = useMemo(() => members.filter((member) => [
    member.nombre_visible, member.nombre, member.apellidos, member.correo,
    member.usuario, member.rfc, member.membresias,
  ].join(' ').toLowerCase().includes(search.toLowerCase())), [members, search]);

  const startEdit = async (member) => {
    try {
      const [overview, profiles] = await Promise.all([
        userDashboardService.overview(),
        scholarshipCodesService.profiles(),
      ]);
      const activeMembers = (overview.accounts || []).filter((account) => account.modern_status === 'ACTIVE');
      const current = activeMembers.find((account) => account.account_id === member.account_id) || member;
      setMembers(activeMembers);
      setLevels(profiles || []);
      setEditing({
        id: current.account_id,
        officialId: current.official_id,
        displayName: current.nombre_visible || '',
        firstName: current.nombre || '',
        lastName: current.apellidos || '',
        email: current.correo || '',
        username: current.usuario || '',
        phone: current.telefono || '',
        rfc: current.rfc || '',
        region: current.region_administrativa || '',
        coordinator: current.coordinador || '',
        state: current.estado_oficial || '',
        municipality: current.municipio_oficial || '',
        postalCode: current.codigo_postal || '',
        neighborhood: current.colonia || '',
        status: current.modern_status || 'ACTIVE',
        scholarshipLevel: String(current.nivel_membresia_id || ''),
        ...blankPassword,
      });
    } catch (error) {
      setNotice({ error: true, text: error.message });
    }
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      await userDashboardService.updateAccount(editing.id, editing);
      if (editing.officialId) {
        await userDashboardService.updateOfficial(editing.officialId, {
          email: editing.email,
          displayName: editing.displayName,
          firstName: editing.firstName,
          lastName: editing.lastName,
          rfc: editing.rfc,
          region: editing.region,
          coordinator: editing.coordinator,
          municipality: editing.municipality,
          state: editing.state,
          postalCode: editing.postalCode,
          neighborhood: editing.neighborhood,
          accountStatus: 'activo',
        });
      }
      setEditing(null);
      setNotice({ text: 'Miembro actualizado correctamente.' });
      await load();
    } catch (error) {
      setNotice({ error: true, text: error.message });
    }
  };

  return <div className="page admin-page members-page">
    <div className="page-heading"><div><p className="eyebrow">Administración de plataforma</p><h1>Miembros</h1><p>Cuentas activas de la plataforma. Administra sus datos personales, acceso y tipo de beca.</p></div><Button variant="secondary" onClick={load}><RefreshCw /> Actualizar</Button></div>
    {notice && <div className={`alert ${notice.error ? 'alert--error' : 'alert--success'}`}>{notice.text}</div>}
    <section className="card members-toolbar"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, correo, usuario, RFC o beca" /></label><div><strong>{visible.length}</strong><span>miembros activos</span></div></section>
    {loading ? <section className="card"><Loader label="Cargando miembros activos" /></section> : visible.length ? <section className="card members-table-wrap"><table className="members-table"><thead><tr><th>Miembro</th><th>Correo y usuario</th><th>Tipo de beca</th><th>Grupos</th><th>Último acceso</th><th></th></tr></thead><tbody>{visible.map((member) => <tr key={member.account_id}><td><strong>{member.nombre_visible || 'Sin nombre'}</strong><small>{[member.nombre, member.apellidos].filter(Boolean).join(' ')}</small></td><td>{member.correo}<small>@{member.usuario}</small></td><td><Badge tone={member.membresia_activa ? 'green' : 'neutral'}>{member.membresias || 'Sin beca activa'}</Badge></td><td>{member.grupos || 'Sin grupo'}</td><td>{member.modern_last_login ? new Date(member.modern_last_login).toLocaleDateString('es-MX') : 'Nunca'}</td><td><Button variant="secondary" onClick={() => startEdit(member)}><Pencil /> Editar</Button></td></tr>)}</tbody></table></section> : <section className="card"><EmptyState title="No hay miembros" description="No existen cuentas activas con esta búsqueda." /></section>}
    <Modal open={Boolean(editing)} title="Editar miembro" className="member-editor-modal" onClose={() => setEditing(null)}>{editing && <form className="member-editor" onSubmit={save}>
      <div className="member-editor-heading"><UserRoundCheck /><div><strong>Cuenta activa</strong><span>La nueva contraseña solo se guardará si completas ambos campos.</span></div></div>
      <div className="member-editor-grid">
        <label><span>Nombre visible</span><input required value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} /></label>
        <label><span>Nombre(s)</span><input value={editing.firstName} onChange={(event) => setEditing({ ...editing, firstName: event.target.value })} /></label>
        <label><span>Apellidos</span><input value={editing.lastName} onChange={(event) => setEditing({ ...editing, lastName: event.target.value })} /></label>
        <label><span>Correo</span><input required type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></label>
        <label><span>Usuario</span><input required value={editing.username} onChange={(event) => setEditing({ ...editing, username: event.target.value })} /></label>
        <label><span>Teléfono</span><input inputMode="tel" maxLength="30" value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></label>
        <label><span>Tipo de beca</span><select value={editing.scholarshipLevel} onChange={(event) => setEditing({ ...editing, scholarshipLevel: event.target.value })}><option value="">Conservar sin asignar</option>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
        {editing.officialId && <>
          <label><span>RFC</span><input maxLength="20" value={editing.rfc} onChange={(event) => setEditing({ ...editing, rfc: event.target.value })} /></label>
          <label><span>Estado</span><input value={editing.state} onChange={(event) => setEditing({ ...editing, state: event.target.value })} /></label>
          <label><span>Municipio</span><input value={editing.municipality} onChange={(event) => setEditing({ ...editing, municipality: event.target.value })} /></label>
          <label><span>Código postal</span><input inputMode="numeric" maxLength="5" value={editing.postalCode} onChange={(event) => setEditing({ ...editing, postalCode: event.target.value })} /></label>
          <label><span>Colonia</span><input value={editing.neighborhood} onChange={(event) => setEditing({ ...editing, neighborhood: event.target.value })} /></label>
          <label><span>Región</span><input value={editing.region} onChange={(event) => setEditing({ ...editing, region: event.target.value })} /></label>
          <label><span>Coordinador</span><input value={editing.coordinator} onChange={(event) => setEditing({ ...editing, coordinator: event.target.value })} /></label>
        </>}
        <label><span>Nueva contraseña</span><input type="password" minLength="8" value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} placeholder="Mínimo 8 caracteres" /></label>
        <label><span>Confirmar contraseña</span><input type="password" minLength="8" value={editing.passwordConfirmation} onChange={(event) => setEditing({ ...editing, passwordConfirmation: event.target.value })} /></label>
      </div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div>
    </form>}</Modal>
  </div>;
}
