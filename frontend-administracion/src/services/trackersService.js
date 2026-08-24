import { apiClient } from '@/services/apiClient';

const query = (filters) => {
  const parameters = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) parameters.set(key, value);
  });
  return parameters.toString();
};

export const trackersService = {
  ai: (filters) => apiClient(`/api/analytics/trackers/ai?${query(filters)}`),
  capsules: (filters) => apiClient(`/api/analytics/trackers/capsules?${query(filters)}`),
  courses: (filters) => apiClient(`/api/analytics/trackers/courses?${query(filters)}`),
};

