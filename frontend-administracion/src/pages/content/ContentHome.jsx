/**
 * @file Pantalla `ContentHome`.
 *
 * Cuadrícula de 4 accesos construida con `ModuleHub`: aquí solo vive la
 * configuración —títulos, descripciones y destinos—, y la presentación está
 * en el componente.
 *
 * Los destinos son cadenas literales y no se comprueban contra la tabla de
 * rutas: un enlace mal escrito lleva a una pantalla en blanco.
 *
 * @see @/components/admin/ModuleHub Implementación.
 */

import ModuleHub from '@/components/admin/ModuleHub';

const items = [
  { to: '/academia/cursos', icon: '01', title: 'Cursos y lecciones', description: 'Cursos, módulos, lecciones, estructura y evaluaciones.' },
  { to: '/contenido/medios', icon: '02', title: 'Biblioteca multimedia', description: 'Imágenes optimizadas, videos, documentos y asociaciones de contenido.' },
  { to: '/contenido/capsulas', icon: '03', title: 'Importar y editar cápsulas', description: 'Alta, edición y publicación de microcontenidos.' },
  { to: '/analitica', icon: '04', title: 'Uso de cursos', description: 'Actividad, progreso, lecciones y usuarios por rango.' },
  { to: '/analitica', icon: '05', title: 'Rachas y cápsulas', description: 'Semáforo, actividad diaria, usuarios destacados y rachas.' },
  { to: '/analitica', icon: '06', title: 'Uso de asistentes y tutores', description: 'Eventos, áreas, niveles y asistentes más utilizados.' },
  { to: '/contenido/videos', icon: '07', title: 'Biblioteca audiovisual', description: 'Carga y administración de videos educativos.' },
  { to: '/contenido/documentos', icon: '08', title: 'Biblioteca documental', description: 'Guías, archivos y materiales descargables.' },
  { to: '/contenido/blog', icon: '09', title: 'Entradas y novedades', description: 'Noticias publicadas automáticamente en el inicio de la Academia.' },
];

export default function ContentHome() {
  return (
    <ModuleHub
      eyebrow="Administración de contenido"
      title="Contenido Academia CABSA"
      description="Herramientas para publicar contenido y consultar su actividad."
      items={items}
      tone="content"
    />
  );
}
