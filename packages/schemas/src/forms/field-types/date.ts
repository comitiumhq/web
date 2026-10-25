import { connectorValueSchemas } from '@comitium/crypto/form-values';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

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
  valueSchema: (ctx) => applyRequirement(connectorValueSchemas.date, ctx),
  connectorCompat: (target) => {
    if (target === 'date') {
      return 'supported';
    }

    return 'unsupported';
  },
};
