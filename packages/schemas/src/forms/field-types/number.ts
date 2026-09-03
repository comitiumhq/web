import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const numberDef: FieldTypeDef = {
  id: 'number',
  meta: {
    label: 'Number',
    description: 'Numeric response',
    group: 'numeric',
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
  valueSchema: (ctx) => applyRequirement(z.number(), ctx),
  connectorCompat: (target) => {
    if (target === 'number') {
      return 'supported';
    }

    return 'unsupported';
  },
};
