import { z } from 'zod';

import { applyRequirement } from './helpers';
import { APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';

export const candidateLocationValueSchema = z
  .object({
    cityId: z.number().int().positive(),
    city: z.string().min(1).max(120),
    region: z.string().min(1).max(120).optional(),
    country: z.string().length(2).toUpperCase(),
  })
  .strict();

export type CandidateLocationValue = z.infer<typeof candidateLocationValueSchema>;

export const candidateLocationDef: FieldTypeDef = {
  id: 'candidate_location',
  meta: {
    label: "Candidate's Location",
    description: "Captures candidate's primary location at apply time",
    group: 'location',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: APPLICATION_LIKE_CLASSES,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: true,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(candidateLocationValueSchema, ctx),
  connectorCompat: () => 'unsupported',
};
