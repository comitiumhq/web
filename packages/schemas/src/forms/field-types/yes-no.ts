import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const yesNoDef: FieldTypeDef = {
  id: 'yes_no',
  meta: {
    label: 'Yes / No',
    description: 'Binary choice',
    group: 'choice',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: ALL_FORM_CLASSES,
    asLibraryObjectType: ALL_OBJECT_TYPES,
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.enum(['yes', 'no']), ctx),
  connectorCompat: (target) => {
    if (target === 'yes_no') {
      return 'supported';
    }

    return 'unsupported';
  },
};
