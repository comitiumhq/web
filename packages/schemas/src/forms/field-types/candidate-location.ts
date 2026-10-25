import { candidateLocationValueSchema } from '@comitium/crypto/candidate-profile';

import { applyRequirement } from './helpers';
import { APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';

export type { CandidateLocationValue } from '@comitium/crypto/candidate-profile';
export { candidateLocationValueSchema } from '@comitium/crypto/candidate-profile';
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
