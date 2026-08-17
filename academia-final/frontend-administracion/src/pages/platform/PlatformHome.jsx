import ModuleHub from '@/components/admin/ModuleHub';

const items = [
  // { to: '/academia/cursos', icon: '01', title: 'Cursos y lecciones', description: 'Catálogo, estructura, contenido y evaluación de cursos.' },
  { to: '/usuarios', icon: '02', title: 'Directorio de usuarios', description: 'Cuentas registradas, perfiles históricos y solicitudes pendientes.' },
  { to: '/plataforma/codigos', icon: '03', title: 'Códigos de membresía', description: 'Crear códigos por correo, consultar uso, vigencias y lotes.' },
  { to: '/plataforma/asesores', icon: '04', title: 'Gestión de asesores', description: 'Configuración y control de asesores del sistema.' },
  { to: '/plataforma/accesos', icon: '05', title: 'Control de accesos', description: 'Gestión de permisos por beca y niveles de acceso.' },
  { to: '/notificaciones/envios', icon: '06', title: 'Envío de correos', description: 'Registro de comunicaciones y entregas por canal.' },
  { to: '/plataforma/peticiones', icon: '07', title: 'Gestor de peticiones', description: 'Solicitudes de soporte, prioridades, asignación y respuesta.' },
  // { to: '/plataforma/asistentes', icon: '08', title: 'Asistentes y tutores', description: 'Enlaces GPT, Gemini, imágenes y orden de publicación.' },
  // { to: '/plataforma/becas', icon: '09', title: 'Becas registradas', description: 'Validación, convocatorias y estado de beneficios CABSA.' },
  // { to: '/plataforma/pendientes', icon: '10', title: 'Activaciones pendientes', description: 'Registros pendientes, activados, cancelados o con error.' },
];

export default function PlatformHome() {
  return (
    <ModuleHub
      eyebrow="Administración de plataforma"
      title="Operación de Academia CABSA"
      description="Herramientas para administrar usuarios, códigos, comunicaciones, soporte y membresías."
      items={items}
      tone="platform"
    />
  );
}
