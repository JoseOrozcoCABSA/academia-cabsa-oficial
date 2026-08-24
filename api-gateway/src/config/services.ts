/**
 * @file Tabla de enrutamiento del gateway: los seis servicios que expone.
 *
 * Es la única fuente de verdad de a dónde va cada prefijo. Añadir un servicio
 * pasa por declararlo aquí, agregar su clave a {@link ServiceKey} y montar su
 * ruta en `routes/gateway.routes.ts`.
 *
 * Los `baseUrl` por defecto apuntan a localhost en los puertos 5001-5006, que
 * sólo sirven para desarrollo. En despliegue hay que definir las variables
 * `*_SERVICE_URL`: si falta una, el gateway arranca igual y las peticiones a ese
 * servicio fallarán con 503 al no encontrar nada en localhost.
 */

/** Claves válidas de servicio. Ampliarla al añadir un microservicio. */
export type ServiceKey =
  | 'academia'
  | 'ai'
  | 'content'
  | 'analytics'
  | 'users'
  | 'notifications';

/** Descripción de un servicio destino. */
export interface ServiceDefinition {
  key: ServiceKey;
  name: string;
  /** URL base del servicio. El gateway le añade `/api` al reenviar. */
  baseUrl: string;
  /** Prefijo que el gateway escucha para este servicio. */
  gatewayPath: string;
  description: string;
}

/** Catálogo de servicios, indexado por clave. */
export const services: Record<ServiceKey, ServiceDefinition> = {
  academia: {
    key: 'academia',
    name: 'academia-service',
    baseUrl: process.env.ACADEMIA_SERVICE_URL ?? 'http://127.0.0.1:5001',
    gatewayPath: '/api/academia',
    description: 'Cursos, lecciones, inscripciones, progreso y certificados',
  },
  ai: {
    key: 'ai',
    name: 'ai-service',
    baseUrl: process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:5002',
    gatewayPath: '/api/ai',
    description: 'Asistentes, prompts, chats, RAG y Qdrant',
  },
  content: {
    key: 'content',
    name: 'content-service',
    baseUrl: process.env.CONTENT_SERVICE_URL ?? 'http://127.0.0.1:5003',
    gatewayPath: '/api/content',
    description: 'Materiales educativos, cápsulas, videos y documentos',
  },
  analytics: {
    key: 'analytics',
    name: 'analytics-service',
    baseUrl: process.env.ANALYTICS_SERVICE_URL ?? 'http://127.0.0.1:5004',
    gatewayPath: '/api/analytics',
    description: 'Eventos, dashboard, rachas y reportes',
  },
  users: {
    key: 'users',
    name: 'users-service',
    baseUrl: process.env.USERS_SERVICE_URL ?? 'http://127.0.0.1:5005',
    gatewayPath: '/api/users',
    description: 'Autenticación, usuarios, roles y permisos',
  },
  notifications: {
    key: 'notifications',
    name: 'notifications-service',
    baseUrl: process.env.NOTIFICATIONS_SERVICE_URL ?? 'http://127.0.0.1:5006',
    gatewayPath: '/api/notifications',
    description: 'Correo, WhatsApp, recordatorios y entregas',
  },
};
