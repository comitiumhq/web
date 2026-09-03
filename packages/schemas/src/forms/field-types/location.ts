import { z } from 'zod';

import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, type FieldTypeDef } from './types';

const locationValue = z.object({
  cityId: z.number().int().positive(),
  city: z.string().min(1).max(120),
  region: z.string().min(1).max(120).optional(),
  country: z.string().min(2).max(2),
});

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
  valueSchema: (ctx) => applyRequirement(locationValue, ctx),
  connectorCompat: (target) => {
    if (target === 'location') {
      return 'supported';
    }

    return 'unsupported';
  },
};
