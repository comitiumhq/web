import { successSchema } from '@comitium/schemas/public';
import {
  type CreateConnectorBody,
  createConnectorResponseSchema,
  listConnectorsResponseSchema,
  pendingProjectionsResponseSchema,
} from '@/lib/schemas/form-field-connectors';
import { isDefined } from '@/lib/utils';

import { api } from './client';

export function getFormConnectors(orgId: string, formId: string) {
  return api.get(`/orgs/${orgId}/forms/${formId}/connectors`, listConnectorsResponseSchema);
}

export function getCandidateFormConnectors(candidateId: string, formId: string) {
  return api.get(`/candidates/${candidateId}/forms/${formId}/connectors`, listConnectorsResponseSchema);
}

export function createConnector(orgId: string, formId: string, body: CreateConnectorBody) {
  return api.post(`/orgs/${orgId}/forms/${formId}/connectors`, body, createConnectorResponseSchema);
}

export function deleteConnector(orgId: string, formId: string, connectorId: string) {
  return api.delete(`/orgs/${orgId}/forms/${formId}/connectors/${connectorId}`, successSchema);
}

interface PendingProjectionsParams {
  cursor?: string;
  limit?: number;
}

export function getPendingProjections(
  orgId: string,
  formId: string,
  connectorId: string,
  params: PendingProjectionsParams = {},
) {
  const search = new URLSearchParams();

  if (params.cursor) {
    search.set('cursor', params.cursor);
  }

  if (isDefined(params.limit)) {
    search.set('limit', String(params.limit));
  }

  const qs = search.toString();
  const path = `/orgs/${orgId}/forms/${formId}/connectors/${connectorId}/pending-projections${qs ? `?${qs}` : ''}`;

  return api.get(path, pendingProjectionsResponseSchema);
}
