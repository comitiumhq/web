import { type ZodTypeAny, z } from 'zod';

import type { FieldQuestionContext, SelectableValue } from './types';

export function applyRequirement(schema: ZodTypeAny, ctx: FieldQuestionContext): ZodTypeAny {
  if (ctx.isRequired) {
    return schema;
  }

  if (ctx.isNullable) {
    return schema.nullable().optional();
  }

  return schema.optional();
}

export function selectableValueSetSchema(values?: SelectableValue[]): ZodTypeAny {
  const allowed = new Set((values ?? []).map((v) => v.value));

  return z.string().refine((s) => allowed.has(s), { message: 'Value not in selectable values' });
}
