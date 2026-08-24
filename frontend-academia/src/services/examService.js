import { apiClient } from '@/services/apiClient';

export const examService = {
  forLesson: (lessonId) => apiClient(`/api/academia/exams/lesson/${lessonId}`),
  submit: (examId, answers) => apiClient(`/api/academia/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  }),
};

