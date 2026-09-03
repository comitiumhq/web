import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

const isoDateOrDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid ISO 8601 date' });

export const dateDef: FieldTypeDef = {
  id: 'date',
  meta: {
    label: 'Date',
    description: 'Date or date-time response',
    group: 'date',
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
  valueSchema: (ctx) => applyRequirement(isoDateOrDateTime, ctx),
  connectorCompat: (target) => {
    if (target === 'date') {
      return 'supported';
    }

    return 'unsupported';
  },
};
