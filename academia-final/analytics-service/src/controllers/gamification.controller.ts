/**
 * @file Capa HTTP de gamificación: cápsulas, cursos, lecciones y resumen.
 *
 * Todos los endpoints operan **sobre el usuario del token**, no sobre un id
 * recibido por parámetro: un usuario no puede consultar ni modificar el avance
 * de otro a través de estas rutas. Por eso exigen `authMiddleware`.
 *
 * @see services/gamification.service.ts Reglas de negocio.
 */

import type { Request, Response } from 'express';
import service from '#services/gamification.service';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

/**
 * Extrae el identificador del usuario del token ya verificado.
 *
 * Acepta `sub` o `subject` porque el payload no es homogéneo: `authMiddleware`
 * envuelve como `{ subject }` los tokens cuyo contenido es una cadena, mientras
 * que los normales traen el `sub` estándar de JWT.
 *
 * @throws {AppError} 401 `USER_REQUIRED` si el token no identifica a nadie, que
 *   es lo que ocurre si la ruta se monta sin `authMiddleware`.
 */
const userId = (request: Request): string => {
  const value = request.auth?.sub ?? request.auth?.subject;
  if (!value) throw new AppError('No fue posible identificar al usuario', 401, 'USER_REQUIRED');
  return String(value);
};

/** Manejadores de gamificación. */
export class GamificationController {
  /**
   * `GET /capsules` — Resumen de cápsulas del usuario.
   *
   * Admite el filtro de semáforo con dos nombres, `semaphoreStatus` o
   * `assessment`, por compatibilidad con versiones anteriores del frontend. Un
   * valor no reconocido lo descarta el servicio y devuelve todo sin filtrar.
   */
  capsules = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.capsuleSummary(
        userId(request),
        request.query.semaphoreStatus ?? request.query.assessment,
      ),
    );
  };

  /**
   * `POST /capsules/:capsuleId/complete` — Marca una cápsula como completada.
   *
   * Es idempotente: repetirla no duplica el avance ni vuelve a otorgar XP. El
   * semáforo se acepta como `semaphoreStatus` o `assessment` en el cuerpo.
   *
   * @returns 200 con el avance actualizado.
   */
  completeCapsule = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.completeCapsule(
        userId(request),
        String(request.params.capsuleId),
        request.body?.semaphoreStatus ?? request.body?.assessment,
      ),
    );
  };

  /** `GET /courses` — Cursos inscritos con su avance y XP. */
  courses = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.courseSummary(userId(request)));
  };

  /**
   * `GET /courses/:courseId/lessons` — Lecciones del curso con su estado.
   *
   * Devuelve todas las lecciones aunque el usuario no esté inscrito; en ese caso
   * ninguna aparece como completada.
   */
  courseLessons = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.courseLessonStatus(
        userId(request),
        String(request.params.courseId),
      ),
    );
  };

  readingTimerStatus = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.readingTimerStatus(
      userId(request), String(request.params.courseId), String(request.params.lessonId),
    ));
  };

  startReadingTimer = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.startReadingTimer(
      userId(request), String(request.params.courseId), String(request.params.lessonId),
    ));
  };

  heartbeatReadingTimer = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.heartbeatReadingTimer(
      userId(request), String(request.params.courseId), String(request.params.lessonId), false,
    ));
  };

  pauseReadingTimer = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.heartbeatReadingTimer(
      userId(request), String(request.params.courseId), String(request.params.lessonId), true,
    ));
  };

  /**
   * `POST /courses/:courseId/lessons/:lessonId/complete` — Completa una lección.
   *
   * Inscribe al usuario si no lo estaba, recalcula el avance del curso y otorga
   * XP una sola vez. Todo dentro de una transacción.
   *
   * @returns 200 con el avance del curso y los puntos concedidos (0 si ya se
   *   habían dado antes).
   */
  completeLesson = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.completeLesson(
        userId(request),
        String(request.params.courseId),
        String(request.params.lessonId),
      ),
    );
  };

  /** `DELETE .../complete` — desmarca la lección conservando el XP ganado. */
  uncompleteLesson = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await service.uncompleteLesson(
        userId(request),
        String(request.params.courseId),
        String(request.params.lessonId),
      ),
    );
  };

  /**
   * `GET /combined` — Resumen unificado para el panel: cápsulas, cursos, XP,
   * nivel y racha en una sola llamada.
   */
  combined = async (request: Request, response: Response): Promise<void> => {
    ok(response, await service.combinedSummary(userId(request)));
  };
}

/** Instancia única lista para montar en las rutas. */
export default new GamificationController();
