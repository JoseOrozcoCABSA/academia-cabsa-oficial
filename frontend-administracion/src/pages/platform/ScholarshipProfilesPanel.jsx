import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, EmptyState, Loader } from '@/components/common';
import { scholarshipCodesService } from '@/services/scholarshipCodesService';

const EMPTY = { name: '', description: '', presentationHtml: '', presentationEyebrow: '', presentationTitle: '', presentationIntroduction: '', presentationBenefits: '', mediaTitle: '', mediaText: '', coursesTitle: '', coursesText: '', forumsTitle: '', forumsText: '', dependentsTitle: '', expirationNumber: 12, expirationPeriod: 'Month', allowSignups: false, copyAccessFrom: '', dependentLevelId: '', dependentRuleName: '', dependentLabel: 'Dependiente', seatLimit: 1, inheritExpiry: true, allowProgress: true, active: true };
const presentationFor = (profile) => {
  const stored = profile?.presentation_config || '';
  if (!stored) return {};
  try { return JSON.parse(stored); } catch { return { html: stored }; }
};
const valuesFor = (profile) => profile ? {
  ...EMPTY,
  name: profile.name || '', description: profile.description || '', expirationNumber: profile.expiration_number || 1,
  expirationPeriod: profile.expiration_period || 'Month', allowSignups: Boolean(Number(profile.allow_signups)), copyAccessFrom: '',
  dependentLevelId: profile.dependent_level_id || '', dependentRuleName: profile.dependent_rule_name || '',
  dependentLabel: profile.dependent_label || 'Dependiente', seatLimit: profile.seat_limit || 1,
  inheritExpiry: profile.inherit_expiry == null ? true : Boolean(Number(profile.inherit_expiry)),
  allowProgress: profile.allow_progress == null ? true : Boolean(Number(profile.allow_progress)),
  active: profile.rule_active == null ? true : Boolean(Number(profile.rule_active)),
  presentationHtml: presentationFor(profile).html || '',
  presentationEyebrow: presentationFor(profile).eyebrow || '', presentationTitle: presentationFor(profile).title || '',
  presentationIntroduction: presentationFor(profile).introduction || '', presentationBenefits: (presentationFor(profile).benefits || []).join('\n'),
  mediaTitle: presentationFor(profile).mediaTitle || '', mediaText: presentationFor(profile).mediaText || '',
  coursesTitle: presentationFor(profile).coursesTitle || '', coursesText: presentationFor(profile).coursesText || '',
  forumsTitle: presentationFor(profile).forumsTitle || '', forumsText: presentationFor(profile).forumsText || '',
  dependentsTitle: presentationFor(profile).dependentsTitle || '',
} : { ...EMPTY };

export default function ScholarshipProfilesPanel({ setNotice, onChanged }) {
  const [profiles, setProfiles] = useState([]), [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const load = () => scholarshipCodesService.profiles().then(setProfiles).finally(() => setLoading(false));
  useEffect(() => { load().catch((error) => setNotice({ error: true, text: error.message })); }, []);
  const edit = (profile) => { setEditingId(profile.id); setForm(valuesFor(profile)); };
  const reset = () => { setEditingId(null); setForm({ ...EMPTY, copyAccessFrom: profiles[0]?.id || '' }); };
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      if (editingId) await scholarshipCodesService.updateProfile(editingId, form);
      else await scholarshipCodesService.createProfile(form);
      setNotice({ text: editingId ? 'Perfil de beca actualizado.' : 'Perfil creado y disponible en códigos y control de acceso.' });
      reset(); await Promise.all([load(), onChanged()]);
    } catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setSaving(false); }
  };
  if (loading) return <section className="card"><Loader label="Cargando perfiles de beca" /></section>;
  return <section className="scholarship-profiles-layout">
    <form className="card scholarship-profile-form" onSubmit={save}>
      <header><div><p className="eyebrow">{editingId ? `Perfil #${editingId}` : 'Nuevo perfil'}</p><h2>{editingId ? 'Editar tipo de beca' : 'Crear tipo de beca'}</h2></div>{editingId && <Button variant="secondary" onClick={reset}><Plus /> Crear otro</Button>}</header>
      <label><span>Nombre de la beca</span><input required value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Hijo Personal CABSA" /></label>
      <fieldset><legend>Contenido HTML de “Mi beca”</legend><p className="source-note">Pega aquí el contenido que se mostrará en <code>/activar-beca</code> para este tipo de beca. Puedes usar títulos, párrafos, listas, enlaces, imágenes y tablas. Si lo dejas vacío, la página se genera automáticamente con el nombre, la descripción y los accesos permitidos.</p><label><span>HTML de la página</span><textarea className="scholarship-html-editor" rows="18" value={form.presentationHtml} onChange={(event) => change('presentationHtml', event.target.value)} spellCheck="false" placeholder={'<h2>Bienvenido/a a tu beca</h2>\n<p>Describe aquí sus beneficios.</p>\n<ul>\n  <li>Primer beneficio</li>\n  <li>Segundo beneficio</li>\n</ul>'} /></label><small>Por seguridad se eliminan scripts, formularios, estilos en línea y atributos de eventos.</small></fieldset>
      <label><span>Descripción</span><textarea required rows="3" value={form.description} onChange={(event) => change('description', event.target.value)} /></label>
      <div className="code-form-grid"><label><span>Vigencia predeterminada</span><input type="number" min="1" max="1200" value={form.expirationNumber} onChange={(event) => change('expirationNumber', event.target.value)} /></label><label><span>Periodo</span><select value={form.expirationPeriod} onChange={(event) => change('expirationPeriod', event.target.value)}><option value="Day">Días</option><option value="Week">Semanas</option><option value="Month">Meses</option><option value="Year">Años</option></select></label></div>
      {!editingId && <label><span>Copiar permisos iniciales de</span><select value={form.copyAccessFrom} onChange={(event) => change('copyAccessFrom', event.target.value)}><option value="">Crear todo bloqueado</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>}
      <label className="profile-check"><input type="checkbox" checked={form.allowSignups} onChange={(event) => change('allowSignups', event.target.checked)} /><span>Permitir registro directo a este nivel</span></label>
      <fieldset><legend>Patrocinio de otras becas (opcional)</legend><p className="source-note">Cualquier tipo de beca puede patrocinar otro. Define aquí qué beca reciben sus beneficiarios y cuántos lugares tendrá cada titular.</p><label><span>Beca que recibirá cada beneficiario</span><select value={form.dependentLevelId} onChange={(event) => change('dependentLevelId', event.target.value)}><option value="">No patrocina otras becas</option>{profiles.filter((profile) => Number(profile.id) !== Number(editingId)).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        {form.dependentLevelId && <><div className="code-form-grid"><label><span>Nombre de la regla</span><input value={form.dependentRuleName} onChange={(event) => change('dependentRuleName', event.target.value)} placeholder="Personal CABSA con hijos" /></label><label><span>Cómo llamar al dependiente</span><input value={form.dependentLabel} onChange={(event) => change('dependentLabel', event.target.value)} placeholder="Hijo / Alumno / Beneficiario" /></label><label><span>Lugares permitidos</span><input type="number" min="1" max="1000" value={form.seatLimit} onChange={(event) => change('seatLimit', event.target.value)} /></label></div><label className="profile-check"><input type="checkbox" checked={form.inheritExpiry} onChange={(event) => change('inheritExpiry', event.target.checked)} /><span>Heredar vencimiento de la beca patrocinadora</span></label><label className="profile-check"><input type="checkbox" checked={form.allowProgress} onChange={(event) => change('allowProgress', event.target.checked)} /><span>Permitir seguimiento de progreso</span></label><label className="profile-check"><input type="checkbox" checked={form.active} onChange={(event) => change('active', event.target.checked)} /><span>Regla activa</span></label></>}
      </fieldset>
      <div className="profile-form-actions"><Link to="/usuarios/accesos"><ShieldCheck /> Configurar páginas y materiales</Link><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear perfil'}</Button></div>
    </form>
    <div className="scholarship-profile-list">{profiles.length ? profiles.map((profile) => <article className="card" key={profile.id}><header><div><strong>{profile.name}</strong><span>Perfil #{profile.id} · {profile.allowed_sections} secciones permitidas</span></div><button type="button" onClick={() => edit(profile)} title="Editar"><Pencil /></button></header><p>{profile.description}</p><div className="profile-card-stats"><span><strong>{profile.codes_count}</strong> códigos</span><span><strong>{profile.activations_count}</strong> activaciones</span><span><strong>{profile.active_sponsors || 0}</strong> patrocinadores</span><span><strong>{profile.managed_groups || 0}</strong> grupos</span></div>{profile.dependent_level_id ? <div className="dependent-rule"><Users /><div><strong>{profile.dependent_rule_name}</strong><span>Patrocina {profile.dependent_level_name} · {profile.seat_limit} lugares por titular · seguimiento {Number(profile.allow_progress) ? 'activo' : 'bloqueado'}</span></div><Badge tone={Number(profile.rule_active) ? 'green' : 'neutral'}>{Number(profile.rule_active) ? 'Activa' : 'Inactiva'}</Badge></div> : <small>No patrocina otras becas.</small>}</article>) : <EmptyState title="Sin perfiles" description="Crea el primer tipo de beca." />}</div>
  </section>;
}
