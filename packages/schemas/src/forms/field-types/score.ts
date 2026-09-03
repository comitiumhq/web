import { z } from 'zod';

import { applyRequirement } from './helpers';
import { FEEDBACK_ONLY_CLASSES, type FieldTypeDef } from './types';

const scoreValue = z.object({
  score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  comment: z.string().max(2_000).optional(),
});

export const scoreDef: FieldTypeDef = {
  id: 'score',
  meta: {
    label: 'Score',
    description: '1-5 star rating with optional comment',
    group: 'rating',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: FEEDBACK_ONLY_CLASSES,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(scoreValue, ctx),
  connectorCompat: () => 'unsupported',
};
