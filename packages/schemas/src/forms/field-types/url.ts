import { httpsUrlSchema } from '../../common';
import { applyRequirement } from './helpers';
import { ALL_FORM_CLASSES, ALL_OBJECT_TYPES, type FieldTypeDef } from './types';

export const urlDef: FieldTypeDef = {
  id: 'url',
  meta: {
    label: 'URL',
    description: 'Web URL',
    group: 'text',
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
  valueSchema: (ctx) => applyRequirement(httpsUrlSchema.max(2_048), ctx),
  connectorCompat: (target) => {
    if (target === 'url' || target === 'short_answer') {
      return 'supported';
    }

    return 'unsupported';
  },
};
