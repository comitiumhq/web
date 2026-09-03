import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, type FieldTypeDef } from './types';

export const phoneDef: FieldTypeDef = {
  id: 'phone',
  meta: {
    label: 'Phone',
    description: 'Phone number',
    group: 'contact',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: ALL_FORM_CLASSES,
    asLibraryObjectType: new Set(['candidate', 'employee']),
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.string().min(3).max(40), ctx),
  connectorCompat: (target) => {
    if (target === 'phone') {
      return 'supported';
    }

    return 'unsupported';
  },
};
