import { apiClient, unwrapList } from '@/services/apiClient';

export const aiCatalogService = {
  assistantTutorLinks: async () => unwrapList(
    await apiClient('/api/ai/catalog/assistant-tutor-links'),
  ),
};

