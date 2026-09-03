import type { ZodTypeAny } from 'zod';

export const FIELD_TYPE_IDS = [
  'short_answer',
  'long_unformatted',
  'long_formattable',
  'phone',
  'email',
  'multiple_choice',
  'checkboxes',
  'date',
  'yes_no',
  'number',
  'currency',
  'score',
  'resume',
  'candidate_location',
  'file',
  'location',
  'url',
  'employee',
  'linear_rating',
  'nps_rating',
] as const;

export type FieldTypeId = (typeof FIELD_TYPE_IDS)[number];

export const OBJECT_TYPES = ['candidate', 'job', 'offer', 'opening', 'project', 'employee', 'archive_reason'] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

export const FORM_CLASSES = [
  'application',
  'sourcing',
  'feedback',
  'survey_diversity',
  'survey_eeoc',
  'survey_candidate_experience',
  'survey_questionnaire',
  'survey_hiring_manager',
  'survey_quality_of_hire',
  'referral',
] as const;

export type FormClass = (typeof FORM_CLASSES)[number];

type FieldTypeGroup = 'text' | 'choice' | 'numeric' | 'date' | 'media' | 'rating' | 'contact' | 'location' | 'people';

type FieldTypeMeta = {
  label: string;
  description: string;
  group: FieldTypeGroup;
};

type FieldTypeCapabilities = {
  asCustomField: boolean;
  asFormQuestion: ReadonlySet<FormClass>;
  asLibraryObjectType: ReadonlySet<ObjectType>;
  canBeSubstitutionToken: boolean;
  canBePredicateOperand: boolean;
  canBeFormConnectorTarget: boolean;
  requiresSingletonPerForm: boolean;
  requiresSelectableValues: boolean;
  triggersWorkflow?: 'resume_processing' | 'set_candidate_location';
};

export type SelectableValue = {
  label: string;
  value: string;
};

export type FieldQuestionContext = {
  isRequired: boolean;
  isNullable: boolean;
  selectableValues?: SelectableValue[];
};

type ConnectorCompatVerdict = 'supported' | 'unsupported' | 'requires_mapping';

export type FieldTypeDef = {
  id: FieldTypeId;
  meta: FieldTypeMeta;
  capabilities: FieldTypeCapabilities;
  valueSchema: (ctx: FieldQuestionContext) => ZodTypeAny;
  connectorCompat: (targetFieldType: FieldTypeId) => ConnectorCompatVerdict;
};

export const ALL_FORM_CLASSES: ReadonlySet<FormClass> = new Set(FORM_CLASSES);
export const ALL_OBJECT_TYPES: ReadonlySet<ObjectType> = new Set(OBJECT_TYPES);
export const FEEDBACK_ONLY_CLASSES: ReadonlySet<FormClass> = new Set(['feedback']);
export const APPLICATION_LIKE_CLASSES: ReadonlySet<FormClass> = new Set([
  'application',
  'sourcing',
  'survey_questionnaire',
  'referral',
]);
