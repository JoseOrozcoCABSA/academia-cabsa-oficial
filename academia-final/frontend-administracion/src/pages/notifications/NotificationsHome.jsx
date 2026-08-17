import ModuleHub from '@/components/admin/ModuleHub';

export default function NotificationsHome() {
  return <ModuleHub eyebrow="Comunicaciones de plataforma" title="Correos, avisos y soporte" description="Coordina mensajes, plantillas, recordatorios y peticiones de usuarios." tone="platform" items={[
    {to:'/notificaciones/envios',icon:'01',title:'Envío de correos',description:'Cola, destinatarios, contenido y estado de entrega.'},
    {to:'/notificaciones/plantillas',icon:'02',title:'Plantillas',description:'Mensajes reutilizables por canal.'},
    {to:'/notificaciones/recordatorios',icon:'03',title:'Recordatorios',description:'Programación de comunicaciones.'},
    {to:'/plataforma/peticiones',icon:'04',title:'Gestor de peticiones',description:'Prioridad, asignación, respuesta y seguimiento.'},
  ]}/>;
}
