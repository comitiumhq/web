import { connectorValueSchemas } from '@comitium/crypto/form-values';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, type FieldTypeDef } from './types';

export const locationDef: FieldTypeDef = {
  id: 'location',
  meta: {
    label: 'Location',
    description: 'Geographic location (city, region, country)',
    group: 'location',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: ALL_FORM_CLASSES,
    asLibraryObjectType: new Set(['candidate', 'job', 'opening', 'employee']),
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(connectorValueSchemas.location, ctx),
  connectorCompat: (target) => {
    if (target === 'location') {
      return 'supported';
    }

    return 'unsupported';
  },
};
