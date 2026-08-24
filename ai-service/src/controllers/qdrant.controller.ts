/**
 * @file Controlador de diagnóstico de Qdrant, la base de datos vectorial.
 *
 * No administra ninguna tabla: expone dos consultas de sólo lectura contra el
 * motor de vectores, para comprobar desde fuera que el subsistema RAG está en
 * pie y qué colecciones tiene.
 *
 * Es el único controlador del servicio que no deriva del CRUD genérico, porque
 * Qdrant no es una base relacional y no pasa por Sequelize.
 *
 * Nota operativa: si Qdrant no responde, el cliente lanza y el error sube al
 * middleware de errores como un 500. Es lo deseable en una sonda —que falle de
 * forma visible—, pero conviene tenerlo en cuenta antes de usar estas rutas
 * como *health check* de un orquestador: tumbarían el estado del servicio
 * completo aunque el resto funcione.
 *
 * @see config/qdrant.ts Cliente y configuración de conexión.
 */

/** Tipos de Express. Sólo tipos: no llegan al paquete compilado. */
import type { Request, Response } from 'express';
/** Cliente de Qdrant ya configurado con la URL y credenciales del entorno. */
import qdrant from '#config/qdrant';
/** Formatea la respuesta con el sobre uniforme del proyecto. */
import { ok } from '#utils/response';

/**
 * Consultas de diagnóstico sobre Qdrant.
 *
 * Los métodos son propiedades con arrow function y no métodos de prototipo,
 * para conservar el `this` al pasarse por referencia a las rutas sin `.bind()`.
 */
export class QdrantController {
  /**
   * `GET /qdrant/health` — Estado del motor de vectores.
   *
   * Reenvía sin transformar lo que responde Qdrant, así que el formato del
   * cuerpo depende de la versión del motor y no de este servicio.
   *
   * @returns 200 con la respuesta de Qdrant.
   * @throws Propaga el error del cliente (500) si Qdrant no está accesible.
   */
  health = async (_request: Request, response: Response): Promise<void> => {
    ok(response, await qdrant.health());
  };

  /**
   * `GET /qdrant/collections` — Colecciones existentes en Qdrant.
   *
   * Sirve para verificar que la colección declarada por una base de
   * conocimiento RAG existe de verdad: si se renombra en
   * `ia_bases_conocimiento_rag` y no en Qdrant, las búsquedas dejan de devolver
   * contexto sin que salte ningún error.
   *
   * @returns 200 con el listado de colecciones.
   * @throws Propaga el error del cliente (500) si Qdrant no está accesible.
   */
  collections = async (_request: Request, response: Response): Promise<void> => {
    ok(response, await qdrant.collections());
  };
}

/** Instancia única lista para montar en `routes/qdrant.routes.ts`. */
export default new QdrantController();
