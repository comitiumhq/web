import { dataArraySchema } from '@comitium/schemas/public';
import { type GetJobsParams, jobsResponseSchema, locationItemSchema } from '@comitium/schemas/public-jobs';
import { skillLookupResponseSchema, skillSearchResponseSchema } from '@comitium/schemas/skills';

import type { PublicJobsTransport } from './types';

// --- Public jobs ---

export function createJobsApi(transport: PublicJobsTransport) {
  function getJobs(params: GetJobsParams = {}) {
    const searchParams = new URLSearchParams({ limit: (params.limit ?? 20).toString() });

    if (params.cursor) {
      searchParams.append('cursor', params.cursor);
    }

    if (params.status) {
      searchParams.append('status', params.status);
    }

    if (params.category) {
      searchParams.append('category', params.category);
    }

    if (params.location) {
      searchParams.append('location', params.location);
    }

    if (params.employmentType) {
      searchParams.append('employmentType', params.employmentType);
    }

    if (params.search) {
      searchParams.append('search', params.search);
    }

    if (params.locationType) {
      searchParams.append('locationType', params.locationType);
    }

    if (params.salaryMin != null) {
      searchParams.append('salaryMin', params.salaryMin.toString());
    }

    if (params.salaryMax != null) {
      searchParams.append('salaryMax', params.salaryMax.toString());
    }

    if (params.sort) {
      searchParams.append('sort', params.sort);
    }

    if (params.skills?.length) {
      searchParams.append('skills', params.skills.join(','));
    }

    return transport.get(`/jobs?${searchParams.toString()}`, jobsResponseSchema);
  }

  function getLocations() {
    return transport.get('/jobs/locations', dataArraySchema(locationItemSchema)).then((res) => res.data);
  }

  function searchSkills(query: string, page = 0, scope: 'all' | 'published' = 'all') {
    const params = new URLSearchParams({ q: query, page: String(page), scope });

    return transport.get(`/skills?${params.toString()}`, skillSearchResponseSchema);
  }

  function getSkillsByIds(ids: string[]) {
    return transport.get(`/skills/lookup?ids=${encodeURIComponent(ids.join(','))}`, skillLookupResponseSchema);
  }

  return { getJobs, getLocations, searchSkills, getSkillsByIds };
}
