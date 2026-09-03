import { nestedFormSchema } from '@comitium/schemas/forms/form-definitions';
import type { EmploymentType, LocationType } from '@comitium/schemas/job-enums';
import { dataArraySchema } from '@comitium/schemas/public';
import { locationItemSchema } from '@comitium/schemas/public-jobs';
import { careerJobSchema, careerJobsResponseSchema, careerPageSchema } from '../schemas/careers';
import type { PublicJobsTransport } from './types';

export type CareerJobsParams = {
  cursor?: string | null;
  department?: string;
  employmentType?: EmploymentType;
  limit?: number;
  location?: string;
  locationType?: LocationType;
};

function appendCareerJobParams(searchParams: URLSearchParams, params: CareerJobsParams) {
  if (params.cursor) {
    searchParams.append('cursor', params.cursor);
  }

  if (params.department) {
    searchParams.append('department', params.department);
  }

  if (params.location) {
    searchParams.append('location', params.location);
  }

  if (params.employmentType) {
    searchParams.append('employmentType', params.employmentType);
  }

  if (params.locationType) {
    searchParams.append('locationType', params.locationType);
  }
}

export function createCareersApi(transport: PublicJobsTransport) {
  function getCareerPage(orgSlug: string, params: CareerJobsParams = {}) {
    const searchParams = new URLSearchParams({ limit: (params.limit ?? 50).toString() });

    appendCareerJobParams(searchParams, params);

    return transport.get(`/careers/${orgSlug}?${searchParams.toString()}`, careerPageSchema);
  }

  function getCareerJobs(orgSlug: string, params: CareerJobsParams = {}) {
    const searchParams = new URLSearchParams({ limit: (params.limit ?? 50).toString() });

    appendCareerJobParams(searchParams, params);

    return transport.get(`/careers/${orgSlug}/jobs?${searchParams.toString()}`, careerJobsResponseSchema);
  }

  function getCareerLocations(orgSlug: string) {
    return transport.get(`/careers/${orgSlug}/locations`, dataArraySchema(locationItemSchema)).then((res) => res.data);
  }

  function getCareerJob(orgSlug: string, postingSlug: string) {
    return transport.get(`/careers/${orgSlug}/jobs/${postingSlug}`, careerJobSchema);
  }

  function getCareerApplyForm(orgSlug: string, postingSlug: string) {
    return transport.get(`/careers/${orgSlug}/jobs/${postingSlug}/apply-form`, nestedFormSchema);
  }

  return { getCareerPage, getCareerJobs, getCareerLocations, getCareerJob, getCareerApplyForm };
}
