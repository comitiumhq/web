import { z } from 'zod';

import { applyRequirement } from './helpers';
import { APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';

const candidateLocationValue = z.object({
  city: z.string().min(1).max(120),
  region: z.string().min(1).max(120).optional(),
  country: z.string().min(2).max(2),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

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
    triggersWorkflow: 'set_candidate_location',
  },
  valueSchema: (ctx) => applyRequirement(candidateLocationValue, ctx),
  connectorCompat: () => 'unsupported',
};
