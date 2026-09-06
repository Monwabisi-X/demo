import { api } from './client';
import type { LearningArticle } from './types';

/**
 * Learning / Information content. Tenant-scoped, published educational articles (claim guides
 * + investment explainers). Requires CONTENT_READ, which CLIENT users hold.
 */
export const learningApi = {
  list(category?: string) {
    return api.get<LearningArticle[]>('/learning', category ? { category } : undefined);
  },
  get(slug: string) {
    return api.get<LearningArticle>(`/learning/${slug}`);
  },
};
