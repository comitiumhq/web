import { candidateLocationDef } from './candidate-location';
import { checkboxesDef } from './checkboxes';
import { currencyDef } from './currency';
import { dateDef } from './date';
import { emailDef } from './email';
import { employeeDef } from './employee';
import { fileDef } from './file';
import { linearRatingDef } from './linear-rating';
import { locationDef } from './location';
import { longFormattableDef } from './long-formattable';
import { longUnformattedDef } from './long-unformatted';
import { multipleChoiceDef } from './multiple-choice';
import { npsRatingDef } from './nps-rating';
import { numberDef } from './number';
import { phoneDef } from './phone';
import { resumeDef } from './resume';
import { scoreDef } from './score';
import { shortAnswerDef } from './short-answer';
import type { FieldTypeDef, FieldTypeId, FormClass, ObjectType } from './types';
import { urlDef } from './url';
import { yesNoDef } from './yes-no';

export const fieldTypeRegistry: Readonly<Record<FieldTypeId, FieldTypeDef>> = Object.freeze({
  short_answer: shortAnswerDef,
  long_unformatted: longUnformattedDef,
  long_formattable: longFormattableDef,
  phone: phoneDef,
  email: emailDef,
  multiple_choice: multipleChoiceDef,
  checkboxes: checkboxesDef,
  date: dateDef,
  yes_no: yesNoDef,
  number: numberDef,
  currency: currencyDef,
  score: scoreDef,
  resume: resumeDef,
  candidate_location: candidateLocationDef,
  file: fileDef,
  location: locationDef,
  url: urlDef,
  employee: employeeDef,
  linear_rating: linearRatingDef,
  nps_rating: npsRatingDef,
});

export function getFieldType(id: FieldTypeId): FieldTypeDef {
  return fieldTypeRegistry[id];
}

export function fieldTypesForFormClass(formClass: FormClass): FieldTypeDef[] {
  return Object.values(fieldTypeRegistry).filter((def) => def.capabilities.asFormQuestion.has(formClass));
}

export function fieldTypesForObjectType(objectType: ObjectType): FieldTypeDef[] {
  return Object.values(fieldTypeRegistry).filter(
    (def) => def.capabilities.asCustomField && def.capabilities.asLibraryObjectType.has(objectType),
  );
}
