import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, type FieldTypeDef } from './types';

export const emailDef: FieldTypeDef = {
  id: 'email',
  meta: {
    label: 'Email',
    description: 'Email address',
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
  valueSchema: (ctx) => applyRequirement(z.email().max(254), ctx),
  connectorCompat: (target) => {
    if (target === 'email' || target === 'short_answer') {
      return 'supported';
    }

    return 'unsupported';
  },
};
