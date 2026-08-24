import ModuleHub from '@/components/admin/ModuleHub';

export default function AiHome() {
  return <ModuleHub eyebrow="Administración de asistentes" title="Inteligencia artificial" description="Configura asistentes, tutores, enlaces, instrucciones y conocimiento." tone="content" items={[
    {to:'/ia/asistentes',icon:'01',title:'Enlaces GPT y Gemini',description:'Actualiza los enlaces públicos de asistentes y tutores por nivel.'},
    {to:'/ia/prompts',icon:'02',title:'Prompts',description:'Plantillas reutilizables.'},
    {to:'/ia/chats',icon:'03',title:'Historial de chats',description:'Sesiones y trazabilidad.'},
    {to:'/ia/rag',icon:'04',title:'RAG y Qdrant',description:'Bases de conocimiento vectorial.'},
    {to:'/analitica',icon:'05',title:'Uso de asistentes',description:'Eventos, áreas, niveles y usuarios.'},
  ]}/>;
}
