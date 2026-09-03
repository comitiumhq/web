import { z } from 'zod';

import { applyRequirement, selectableValueSetSchema } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const checkboxesDef: FieldTypeDef = {
  id: 'checkboxes',
  meta: {
    label: 'Checkboxes',
    description: 'Multiple selections from a predefined list',
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
    requiresSelectableValues: true,
  },
  valueSchema: (ctx) => {
    const inner = z.array(selectableValueSetSchema(ctx.selectableValues));
    const constrained = ctx.isRequired ? inner.min(1) : inner;

    return applyRequirement(constrained, ctx);
  },
  connectorCompat: (target) => {
    if (target === 'checkboxes') {
      return 'supported';
    }

    if (target === 'multiple_choice') {
      return 'requires_mapping';
    }

    return 'unsupported';
  },
};
