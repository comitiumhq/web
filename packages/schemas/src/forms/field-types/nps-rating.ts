import { z } from 'zod';

import { applyRequirement } from './helpers';
import type { FieldTypeDef, FormClass } from './types';

const npsClasses = new Set<FormClass>(['survey_candidate_experience', 'survey_questionnaire']);

export const npsRatingDef: FieldTypeDef = {
  id: 'nps_rating',
  meta: {
    label: 'NPS Rating',
    description: '0-10 Net Promoter Score scale',
    group: 'rating',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: npsClasses,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: true,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.number().int().min(0).max(10), ctx),
  connectorCompat: () => 'unsupported',
};
