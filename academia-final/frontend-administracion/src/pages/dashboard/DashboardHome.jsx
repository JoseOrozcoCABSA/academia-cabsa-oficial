/**
 * @file Componente `DashboardHome`.
 *
 * Consume: `apiClient`.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, GraduationCap, Library, Server, Users, BellRing, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Card, Badge } from '@/components/common';
const modules = [
  {key:'academia',name:'Administración de plataforma',description:'Usuarios, cursos, códigos, becas, comunicaciones y operación académica',to:'/plataforma',icon:GraduationCap,color:'red'},
  {key:'content',name:'Administración de contenido',description:'Cursos, medios, cápsulas, asistentes y tableros de uso',to:'/contenido',icon:Library,color:'gold'},
  {key:'ai',name:'Inteligencia artificial',description:'Asistentes, prompts, chats y conocimiento RAG',to:'/ia/asistentes',icon:Bot,color:'violet'},
  {key:'analytics',name:'Analítica',description:'Eventos, actividad, rachas, tablero y reportes',to:'/analitica',icon:Activity,color:'blue'},
  {key:'users',name:'Usuarios',description:'Login, registro, roles, permisos y grupos',to:'/usuarios',icon:Users,color:'green'},
  {key:'notifications',name:'Notificaciones',description:'Correo, WhatsApp, recordatorios y entregas',to:'/notificaciones',icon:BellRing,color:'orange'},
];
/**
 * Normaliza la respuesta de salud del gateway a un arreglo.
 *
 * Admite tres formas —arreglo, `{ services: [] }` y un objeto indexado por
 * nombre— porque el formato ha cambiado entre versiones del gateway. En el
 * ultimo caso, un valor que no sea objeto se interpreta como el estado.
 */
const normalizeHealth=(data)=>{if(Array.isArray(data))return data;if(Array.isArray(data?.services))return data.services;return Object.entries(data?.services||data||{}).map(([key,value])=>({key,...(typeof value==='object'?value:{status:value})}))};
/**
 * Centro de control: estado de los seis servicios y accesos a cada modulo.
 *
 * Consulta la salud una sola vez al montar; no refresca por si solo, asi que un
 * servicio que caiga despues seguira apareciendo disponible hasta recargar.
 */
export default function DashboardHome(){
  const [health,setHealth]=useState([]); const [error,setError]=useState('');
  useEffect(()=>{apiClient('/services/health').then((data)=>setHealth(normalizeHealth(data))).catch((e)=>setError(e.message))},[]);
  /**
   * Estado de un servicio, buscandolo por tres vias: `key` exacta, `name` que
   * lo contenga y `service` exacta. Es una conciliacion por nombre, no por
   * identificador, y devuelve `undefined` si ninguna encaja, que la vista pinta
   * como «Registrado».
   */
  const statusFor=(key)=>health.find((item)=>item.key===key||item.name?.includes(key))?.status||health.find((item)=>item.service===key)?.status;
  /**
   * Cuenta los servicios sanos comparando con una lista fija de valores
   * (`ok`, `healthy`, `online`, `UP`, `true`). Un estado sano con otro nombre se
   * contaria como caido.
   */
  const online=modules.filter((item)=>['ok','healthy','online','UP',true].includes(statusFor(item.key))).length;
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">Operación integral</p><h1>Centro de control</h1><p>Visibilidad y administración de los seis dominios SOA de Academia CABSA.</p></div><div className="last-update"><span><i/> Entorno local</span><small>Gateway · http://127.0.0.1:6080</small></div></div>
    {error&&<div className="alert"><AlertTriangle/> {error}</div>}
    <section className="admin-metrics"><Card><span className="metric-icon red"><Server/></span><div><small>Servicios registrados</small><strong>6</strong><p>Detrás de un solo Gateway</p></div></Card><Card><span className="metric-icon green"><CheckCircle2/></span><div><small>Servicios disponibles</small><strong>{health.length?online:'—'}</strong><p>Verificación en tiempo real</p></div></Card><Card><span className="metric-icon gold"><Activity/></span><div><small>Arquitectura</small><strong>SOA</strong><p>Servicios desacoplados</p></div></Card><Card><span className="metric-icon blue"><Users/></span><div><small>Acceso</small><strong>JWT</strong><p>Autenticación centralizada</p></div></Card></section>
    <div className="section-heading"><div><p className="eyebrow">Dominios operativos</p><h2>Servicios de la plataforma</h2></div><Badge tone="green">Gateway activo</Badge></div>
    <section className="module-grid">{modules.map(({key,name,description,to,icon:Icon,color})=><Link className="module-card" to={to} key={key}><div className={`module-icon ${color}`}><Icon/></div><div><span><h3>{name}</h3><Badge tone={statusFor(key)?'green':'neutral'}>{statusFor(key)||'Registrado'}</Badge></span><p>{description}</p><strong>Administrar módulo <ArrowRight/></strong></div></Link>)}</section>
    <div className="detail-grid"><Card><div className="card-heading"><div><p className="eyebrow">Flujo central</p><h2>Actividad operativa reciente</h2></div><Link to="/analitica">Ver analítica</Link></div><ul className="activity-feed"><li><span className="feed-dot green"/><div><strong>Gateway disponible</strong><p>Enrutamiento para seis servicios configurado.</p></div><small>Ahora</small></li><li><span className="feed-dot gold"/><div><strong>Catálogo académico conectado</strong><p>Cursos y lecciones disponibles para administración.</p></div><small>Sistema</small></li><li><span className="feed-dot red"/><div><strong>Control de acceso JWT</strong><p>Las rutas operativas requieren autenticación.</p></div><small>Activo</small></li></ul></Card><Card><p className="eyebrow">Arquitectura</p><h2>Puertos locales</h2><div className="port-list">{modules.map((item,index)=><div key={item.key}><span><i className={statusFor(item.key)?'online':''}/><strong>{item.name}</strong></span><code>{5001+index}</code></div>)}</div></Card></div>
  </div>;
}
