import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_OBJECT_TYPES, APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';

export const longUnformattedDef: FieldTypeDef = {
  id: 'long_unformatted',
  meta: {
    label: 'Long Answer (plain)',
    description: 'Multi-line plain-text response',
    group: 'text',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: APPLICATION_LIKE_CLASSES,
    asLibraryObjectType: ALL_OBJECT_TYPES,
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.string().min(1).max(10_000), ctx),
  connectorCompat: (target) => {
    if (target === 'long_unformatted' || target === 'short_answer') {
      return 'supported';
    }

    return 'unsupported';
  },
};
