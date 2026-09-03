import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_OBJECT_TYPES, FEEDBACK_ONLY_CLASSES, type FieldTypeDef } from './types';

const currencyValue = z.object({
  amount: z.number(),
  currency: z.string().length(3).toUpperCase(),
});

export const currencyDef: FieldTypeDef = {
  id: 'currency',
  meta: {
    label: 'Currency',
    description: 'Monetary amount with ISO 4217 currency code',
    group: 'numeric',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: FEEDBACK_ONLY_CLASSES,
    asLibraryObjectType: ALL_OBJECT_TYPES,
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(currencyValue, ctx),
  connectorCompat: (target) => {
    if (target === 'currency') {
      return 'supported';
    }

    return 'unsupported';
  },
};
