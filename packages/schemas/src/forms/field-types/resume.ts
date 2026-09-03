import { applyRequirement } from './helpers';
import { APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';
import { uploadedFileValueSchema } from './uploaded-file-value';

export const resumeDef: FieldTypeDef = {
  id: 'resume',
  meta: {
    label: 'Resume',
    description: 'Candidate resume upload — triggers resume processing pipeline',
    group: 'media',
  },
  capabilities: {
    asCustomField: false,
    asFormQuestion: APPLICATION_LIKE_CLASSES,
    asLibraryObjectType: new Set(),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: false,
    requiresSingletonPerForm: true,
    requiresSelectableValues: false,
    triggersWorkflow: 'resume_processing',
  },
  valueSchema: (ctx) => applyRequirement(uploadedFileValueSchema, ctx),
  connectorCompat: () => 'unsupported',
};
