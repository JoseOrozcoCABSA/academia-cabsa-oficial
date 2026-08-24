import { apiClient } from '@/services/apiClient';

export const examService = {
  getForLesson: (lessonId) => apiClient(`/api/academia/exams/admin/lesson/${lessonId}`),
  saveForLesson: (lessonId, exam) => apiClient(`/api/academia/exams/admin/lesson/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(exam),
  }),
};

