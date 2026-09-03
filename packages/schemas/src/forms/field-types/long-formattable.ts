import { z } from 'zod';

import { applyRequirement } from './helpers';
import { FEEDBACK_ONLY_CLASSES, type FieldTypeDef } from './types';

export const longFormattableDef: FieldTypeDef = {
  id: 'long_formattable',
  meta: {
    label: 'Long Answer (rich text)',
    description: 'Multi-line response with rich-text formatting',
    group: 'text',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: FEEDBACK_ONLY_CLASSES,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.string().min(1).max(50_000), ctx),
  connectorCompat: () => 'unsupported',
};
