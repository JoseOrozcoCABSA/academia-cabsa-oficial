/**
 * @file Pantalla CRUD generica del panel de administracion.
 *
 * Una sola pantalla sirve a todas las entidades: `resources[resource]` aporta el
 * titulo, los campos del formulario y la ruta, y `services[config.service]`
 * elige a que microservicio hablar. Anadir una tabla al panel es anadir una
 * entrada de configuracion, no un archivo.
 *
 * El codigo esta minificado a mano (sin espacios ni saltos). No se ha
 * reformateado a proposito para no mezclar cambios de estilo con la
 * documentacion.
 *
 * @see config/resources.js Catalogo de entidades administrables.
 * @see components/common/index.jsx Componentes de la tabla y el formulario.
 */

import { useCallback, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { academiaService } from '@/services/academiaService';
import { aiService } from '@/services/aiService';
import { contentService } from '@/services/contentService';
import { usersService } from '@/services/usersService';
import { notificationsService } from '@/services/notificationsService';
import { analyticsService } from '@/services/analyticsService';
import { authService } from '@/services/authService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Loader, Modal, Select, Table, Textarea } from '@/components/common';
import { resources } from '@/config/resources';
import { createClientUuid } from '@/utils/clientId';
/**
 * Mapa de `config.service` al cliente correspondiente.
 *
 * Una entidad cuyo `service` no este en este mapa deja `service` en `undefined`
 * y la pantalla revienta al primer render, no al usarla.
 */
const services={academia:academiaService,ai:aiService,content:contentService,users:usersService,notifications:notificationsService,analytics:analyticsService};
/**
 * Genera el identificador de los recursos con `idType === 'uuid'`.
 *
 * `crypto.randomUUID` solo existe en contexto seguro: por HTTPS o en
 * `localhost` funciona, pero servido por HTTP simple desde una IP de la red
 * queda `undefined` y el alta falla con «no es una funcion».
 */
const uuid=createClientUuid;
/**
 * Convierte el formulario en el cuerpo que espera la API.
 *
 * Aplica los valores por omision y convierte los tipos del formulario. Las
 * marcas de tiempo las asigna el repositorio con el reloj del servidor.
 *
 * @param {boolean|object} editing Registro en edicion, o falso en un alta;
 *   determina si se asigna `id` y `created_at`.
 */
const prepare=(config,form,editing)=>{
  const values={...config.defaults,...form};
  for(const [key,,type] of config.fields){if(type==='number'&&values[key]!==''&&values[key]!=null)values[key]=Number(values[key]);if(type==='checkbox')values[key]=Boolean(values[key]);}
  if(config.idType==='uuid'&&!editing)values.id=uuid();
  delete values.created_at; delete values.updated_at;
  return values;
};
/**
 * Pantalla de listado, alta, edicion y baja de una entidad.
 *
 * @param {string} resource Clave dentro de `config/resources.js`. Una clave
 *   inexistente deja `config` en `undefined` y la pantalla falla al renderizar.
 */
export default function ResourcePage({resource}){
  const config=resources[resource]; const service=services[config.service];
  /** Carga del listado; se rehace si cambia la entidad mostrada. */
  const loader=useCallback(()=>service.list(config.path),[service,config.path]);
  const {items,loading,error,reload}=useRemoteList(loader,[]);
  const [search,setSearch]=useState(''); const [editing,setEditing]=useState(null); const [form,setForm]=useState({}); const [modalOpen,setModalOpen]=useState(false); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState(''); const [remove,setRemove]=useState(null);
  /**
   * Abre el formulario en alta o en edicion.
   *
   * En edicion copia solo los campos declarados en `config.fields`, asi que las
   * columnas que la configuracion no lista no viajan de vuelta al guardar y
   * conservan su valor.
   */
  const open=(item=null)=>{setEditing(item);setForm(item?Object.fromEntries(config.fields.map(([key])=>[key,item[key]??''])):{...config.defaults});setNotice('');setModalOpen(true)};
  /** Cierra el formulario y descarta lo escrito. No pide confirmacion. */
  const close=()=>{setEditing(null);setForm({});setModalOpen(false)};
  /**
   * Guarda el alta o la edicion.
   *
   * Contiene una excepcion importante: **crear un usuario no usa el CRUD
   * generico**, sino `authService.register`, para que la contrasena se cifre en
   * el servidor. Por la misma razon el resto de ramas hacen
   * `delete values.password`, de modo que desde esta pantalla **no se puede
   * cambiar la contrasena de un usuario existente**.
   *
   * Los errores se muestran en el propio formulario y este no se cierra, para
   * no perder lo escrito. El `finally` libera el boton siempre.
   */
  const save=async(e)=>{e.preventDefault();setSaving(true);setNotice('');try{const values=prepare(config,form,editing);if(resource==='users'&&!editing){await authService.register({email:form.email,username:form.username,password:form.password,firstName:form.first_name,lastName:form.last_name});}else{delete values.password;if(editing)await service.update(config.path,editing.id,values);else await service.create(config.path,values);}close();await reload();}catch(requestError){setNotice(requestError.message)}finally{setSaving(false)}};
  /**
   * Ejecuta la baja confirmada.
   *
   * Si falla, cierra el dialogo y deja el aviso en la pantalla; el registro
   * sigue existiendo aunque el dialogo haya desaparecido.
   */
  const confirmRemove=async()=>{try{await service.remove(config.path,remove.id);setRemove(null);await reload()}catch(e){setNotice(e.message);setRemove(null)}};
  /**
   * Busqueda en cliente sobre los registros ya cargados.
   *
   * Compara contra `JSON.stringify(item)` completo, asi que tambien encuentra
   * coincidencias en columnas que la tabla no muestra —identificadores, fechas
   * internas— y eso desconcierta: aparece una fila sin que se vea por que.
   * Ademas filtra solo lo traido, no consulta al servidor.
   */
  const filtered=useMemo(()=>items.filter((item)=>JSON.stringify(item).toLowerCase().includes(search.toLowerCase())),[items,search]);
  /**
   * Columnas de la tabla: las cuatro primeras de la configuracion mas la de
   * acciones.
   *
   * `status` e `is_active` se pintan como etiqueta, y el tono verde se decide
   * con una lista fija de valores (`ACTIVE`, `PUBLISHED`, `SENT`, ...). Un
   * estado nuevo en la base se vera en gris hasta que se anada a esa lista.
   */
  const mainFields=config.fields.slice(0,4); const columns=[...mainFields.map(([key,label])=>({key,label,render:(row)=>key==='status'||key==='is_active'?<Badge tone={row[key]===true||['ACTIVE','PUBLISHED','published','SENT','DELIVERED'].includes(row[key])?'green':'neutral'}>{row[key]===true?'Activo':String(row[key]??'—')}</Badge>:String(row[key]??'—')})),{key:'actions',label:'Acciones',render:(row)=><div className="row-actions"><button onClick={()=>open(row)} title="Editar"><Edit3/></button><button className="danger" onClick={()=>setRemove(row)} title="Eliminar"><Trash2/></button></div>}];
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">{config.service}-service</p><h1>{config.title}</h1><p>Consulta, añade, actualiza y elimina registros mediante el Gateway central.</p></div><Button onClick={()=>open()}><Plus/> Añadir {config.singular}</Button></div>
    <div className="resource-toolbar"><label className="search search--page"><Search/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={`Buscar en ${config.title.toLowerCase()}`}/></label><button className="icon-button refresh" onClick={reload}><RefreshCw/></button><span>{filtered.length} registros</span></div>
    {error&&<div className="alert">{error}</div>}{notice&&<div className="alert alert--error">{notice}</div>}
    <section className="card resource-table">{loading?<Loader/>:filtered.length?<Table columns={columns} rows={filtered}/>:<EmptyState title={`No hay ${config.title.toLowerCase()}`} description="Añade el primer registro o carga la información de la base academiacabsa." action={<Button onClick={()=>open()}><Plus/> Crear registro</Button>}/>}</section>
    <Modal open={modalOpen} title={editing?`Editar ${config.singular}`:`Añadir ${config.singular}`} onClose={close}><form onSubmit={save} className="resource-form">{config.fields.filter(([key])=>key!=='password'||!editing).map(([key,label,type,options])=>{
      if(type==='textarea')return <Textarea key={key} label={label} rows="4" value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>;
      if(type==='select')return <Select key={key} label={label} value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}><option value="">Selecciona</option>{options.map((option)=><option key={option}>{option}</option>)}</Select>;
      if(type==='checkbox')return <label className="check-field" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e)=>setForm({...form,[key]:e.target.checked})}/><span>{label}</span></label>;
      return <Input key={key} label={label} type={type} value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>;
    })}{notice&&<div className="alert alert--error">{notice}</div>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={close}>Cancelar</Button><Button disabled={saving}>{saving?'Guardando…':'Guardar cambios'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(remove)} title={`Eliminar ${config.singular}`} message="Esta acción eliminará el registro de MySQL. No se puede deshacer desde la interfaz." onClose={()=>setRemove(null)} onConfirm={confirmRemove}/>
  </div>;
}
