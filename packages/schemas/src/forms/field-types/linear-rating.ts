import { z } from 'zod';

import { applyRequirement } from './helpers';
import type { FieldTypeDef, FormClass } from './types';

const linearRatingClasses = new Set<FormClass>(['survey_questionnaire', 'survey_candidate_experience', 'feedback']);

export const linearRatingDef: FieldTypeDef = {
  id: 'linear_rating',
  meta: {
    label: 'Linear Rating',
    description: 'N-point linear scale (e.g., 1-5, 1-10)',
    group: 'rating',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: linearRatingClasses,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.number().int().min(1).max(10), ctx),
  connectorCompat: () => 'unsupported',
};
