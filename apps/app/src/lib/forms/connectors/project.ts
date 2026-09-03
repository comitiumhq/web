import type { FieldTypeId } from '@comitium/schemas/forms';
import { getFieldType } from '@comitium/schemas/forms';
import type { ConnectorRow } from '@/lib/schemas/form-field-connectors';

import { isDefined } from '@/lib/utils';

export type ProjectedValue = string | number | string[] | Record<string, unknown>;

export interface ProjectionOp {
  connectorId: string;
  fieldId: string;
  fieldType: FieldTypeId;
  value: ProjectedValue;
}

interface DecryptedSubmission {
  id: string;
  formId: string;
  answers: Record<string, unknown>;
}

function projectChoiceMapping(
  sourceValue: string,
  optionMapping: Record<string, string> | null,
  unmappedFallback: string | null,
): string | null {
  const direct = optionMapping?.[sourceValue];

  if (isDefined(direct)) {
    return direct;
  }

  return unmappedFallback;
}

export function projectAnswer(
  answer: unknown,
  connector: ConnectorRow,
  sourceType: FieldTypeId,
  targetType: FieldTypeId,
): ProjectedValue | null {
  if (!isDefined(answer) || answer === '') {
    return null;
  }

  const verdict = getFieldType(sourceType).connectorCompat(targetType);

  if (verdict === 'unsupported') {
    return null;
  }

  if (sourceType === 'multiple_choice' && targetType === 'checkboxes') {
    if (typeof answer !== 'string') {
      return null;
    }

    const mapped = projectChoiceMapping(answer, connector.optionMapping, connector.unmappedFallback);

    return mapped ? [mapped] : null;
  }

  if (sourceType === 'checkboxes' && targetType === 'multiple_choice') {
    if (!Array.isArray(answer)) {
      return null;
    }

    for (const v of answer) {
      if (typeof v !== 'string') {
        continue;
      }

      const mapped = projectChoiceMapping(v, connector.optionMapping, connector.unmappedFallback);

      if (mapped) {
        return mapped;
      }
    }

    return null;
  }

  if (Array.isArray(answer)) {
    if (targetType === 'checkboxes' && answer.every((v) => typeof v === 'string')) {
      return answer as string[];
    }

    return null;
  }

  if (targetType === 'multiple_choice') {
    return typeof answer === 'string' ? answer : null;
  }

  const parsed = getFieldType(targetType).valueSchema({ isRequired: true, isNullable: false }).safeParse(answer);

  return parsed.success ? (parsed.data as ProjectedValue) : null;
}

export interface CollectProjectionsParams {
  submission: DecryptedSubmission;
  connectors: ConnectorRow[];
}

export function collectProjections({ submission, connectors }: CollectProjectionsParams): ProjectionOp[] {
  const ops: ProjectionOp[] = [];

  for (const connector of connectors) {
    const answer = submission.answers[connector.formQuestionId];

    if (!isDefined(answer)) {
      continue;
    }

    const value = projectAnswer(answer, connector, connector.questionType, connector.fieldType);

    if (value === null) {
      continue;
    }

    ops.push({ connectorId: connector.id, fieldId: connector.fieldId, fieldType: connector.fieldType, value });
  }

  return ops;
}
