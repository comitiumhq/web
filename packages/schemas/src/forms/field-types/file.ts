import { applyRequirement } from './helpers';
import { APPLICATION_LIKE_CLASSES, type FieldTypeDef } from './types';
import { uploadedFileValueSchema } from './uploaded-file-value';

export const fileDef: FieldTypeDef = {
  id: 'file',
  meta: {
    label: 'File Upload',
    description: 'Arbitrary file upload',
    group: 'media',
  },
  capabilities: {
    asCustomField: true,
    asFormQuestion: APPLICATION_LIKE_CLASSES,
    asLibraryObjectType: new Set(['job', 'offer', 'opening', 'project']),
    canBeSubstitutionToken: false,
    canBePredicateOperand: false,
    canBeFormConnectorTarget: true,
    requiresSingletonPerForm: false,
    requiresSelectableValues: false,
  },
  valueSchema: (ctx) => applyRequirement(uploadedFileValueSchema, ctx),
  connectorCompat: (target) => {
    if (target === 'file') {
      return 'supported';
    }

    return 'unsupported';
  },
};
