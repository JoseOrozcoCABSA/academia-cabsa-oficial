/**
 * @file Servicio `gamificationService` del frontend.
 *
 * Se apoya en `apiClient`, que a su vez llama al gateway.
 *
 * Operaciones de progreso, temporizador y gamificación:
 * - `capsuleSummary(semaphoreStatus = '')`
 * - `completeCapsule(capsuleId, semaphoreStatus)`
 * - `courseSummary()`
 * - `courseLessonStatus(courseId)`
 * - `completeLesson(courseId, lessonId)`
 * - `uncompleteLesson(courseId, lessonId)`
 * - `combinedSummary()`
 *
 * Los errores se propagan como `Error` con el mensaje del backend:
 * quien llame debe capturarlos y mostrarlos.
 */

import { apiClient } from '@/services/apiClient';

const basePath = '/api/analytics/learning-progress';

/**
 * Progreso, puntos y rachas del usuario en curso.
 *
 * El identificador del usuario nunca se envia: el backend lo saca del token, asi
 * que estas llamadas solo devuelven datos propios.
 */
export const gamificationService = {
  capsuleSummary(semaphoreStatus = '') {
    const query = semaphoreStatus
      ? `?semaphoreStatus=${encodeURIComponent(semaphoreStatus)}`
      : '';
    return apiClient(`${basePath}/capsules${query}`);
  },

  completeCapsule(capsuleId, semaphoreStatus) {
    return apiClient(`${basePath}/capsules/${capsuleId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ semaphoreStatus }),
    });
  },

  courseSummary() {
    return apiClient(`${basePath}/courses`);
  },

  courseLessonStatus(courseId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons`);
  },

  completeLesson(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
  },

  uncompleteLesson(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'DELETE',
    });
  },

  readingTimerStatus(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/timer`);
  },

  startReadingTimer(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/timer/start`, { method: 'POST' });
  },

  heartbeatReadingTimer(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/timer/heartbeat`, { method: 'POST' });
  },

  pauseReadingTimer(courseId, lessonId) {
    return apiClient(`${basePath}/courses/${courseId}/lessons/${lessonId}/timer/pause`, { method: 'POST' });
  },

  combinedSummary() {
    return apiClient(`${basePath}/combined`);
  },
};
