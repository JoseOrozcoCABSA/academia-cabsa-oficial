/**
 * @file Cliente minimo de Qdrant, la base vectorial que respalda la busqueda
 * semantica.
 *
 * Solo cubre consultas de estado; las operaciones sobre vectores se hacen en
 * otro sitio. Usa `fetch` directamente, sin la biblioteca oficial.
 *
 * Al depurar, tener en cuenta que **cualquier fallo se convierte en el mismo 503
 * `QDRANT_UNAVAILABLE`**: una URL mal configurada, un contenedor caido y un 500
 * de Qdrant se ven igual desde fuera, y el estado original se pierde.
 */

import env from '#config/env';
import { AppError } from '#utils/errors';

const qdrantUrl = process.env.QDRANT_URL ?? 'http://127.0.0.1:6333';

/** Consultas de estado de Qdrant. */
export class QdrantClient {
  /**
   * Comprueba que Qdrant responde.
   *
   * @returns `{ status: 'ok', url }`, con la URL para poder verificar contra que
   *   instancia se hablo.
   * @throws {AppError} 503 `QDRANT_UNAVAILABLE`.
   */
  async health() {
    try {
      const response = await fetch(`${qdrantUrl}/healthz`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { status: 'ok', url: qdrantUrl };
    } catch {
      throw new AppError('Qdrant no está disponible', 503, 'QDRANT_UNAVAILABLE');
    }
  }

  /**
   * Lista las colecciones existentes.
   *
   * Devuelve la respuesta de Qdrant sin transformar, asi que quien la consuma
   * queda acoplado al formato de su API.
   *
   * @throws {AppError} 503 `QDRANT_UNAVAILABLE`.
   */
  async collections() {
    try {
      const response = await fetch(`${qdrantUrl}/collections`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch {
      throw new AppError('Qdrant no está disponible', 503, 'QDRANT_UNAVAILABLE');
    }
  }
}

/** Instancia de `QdrantClient` lista para usar. */
export default new QdrantClient();
