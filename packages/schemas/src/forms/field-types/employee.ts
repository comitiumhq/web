import { z } from 'zod';

import { applyRequirement } from './helpers';
import type { FieldTypeDef, FormClass } from './types';

const NO_FORM_CLASSES: ReadonlySet<FormClass> = new Set();

export const employeeDef: FieldTypeDef = {
  id: 'employee',
  meta: {
    label: 'Employee',
    description: 'Reference to an org user (e.g., org admin, hiring manager assignment)',
    group: 'people',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: NO_FORM_CLASSES,
    asLibraryObjectType: new Set(['candidate', 'job', 'offer', 'opening', 'project']),
    canBeSubstitutionToken: false,
    canBePredicateOperand: true,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(z.guid(), ctx),
  connectorCompat: () => 'unsupported',
};
