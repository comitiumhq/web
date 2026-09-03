import { applyRequirement, selectableValueSetSchema } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const multipleChoiceDef: FieldTypeDef = {
  id: 'multiple_choice',
  meta: {
    label: 'Multiple Choice',
    description: 'Single selection from a predefined list',
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
  valueSchema: (ctx) => applyRequirement(selectableValueSetSchema(ctx.selectableValues), ctx),
  connectorCompat: (target) => {
    if (target === 'multiple_choice') {
      return 'supported';
    }

    if (target === 'checkboxes') {
      return 'requires_mapping';
    }

    return 'unsupported';
  },
};
