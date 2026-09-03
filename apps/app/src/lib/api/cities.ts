import { citiesResponseSchema } from '@comitium/schemas/cities';

import { api } from './client';

export function searchCities(query: string) {
  return api.get(`/cities/search?q=${encodeURIComponent(query)}`, citiesResponseSchema);
}
