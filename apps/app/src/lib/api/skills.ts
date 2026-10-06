import { skillSearchResponseSchema } from '@comitium/schemas/skills';
import { api } from './client';

export function searchSkills(query: string, page = 0) {
  const params = new URLSearchParams({ q: query, page: String(page) });

  return api.get(`/skills?${params.toString()}`, skillSearchResponseSchema);
}
