import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const shortAnswerDef: FieldTypeDef = {
  id: 'short_answer',
  meta: {
    label: 'Short Answer',
    description: 'Single-line text response',
    group: 'text',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: ALL_FORM_CLASSES,
    asLibraryObjectType: ALL_OBJECT_TYPES,
    canBeSubstitutionToken: true,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.string().min(1).max(500), ctx),
  connectorCompat: (target) => {
    if (target === 'short_answer' || target === 'long_unformatted' || target === 'url' || target === 'email') {
      return 'supported';
    }

    return 'unsupported';
  },
};
