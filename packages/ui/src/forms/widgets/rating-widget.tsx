import type { RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { cn } from '@comitium/ui/cn';
import { memo, useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

interface RatingWidgetProps {
  question: RenderableFormQuestion;
  field: ControllerRenderProps;
}

const RANGE_BY_TYPE: Partial<Record<RenderableFormQuestion['questionType'], { min: number; max: number }>> = {
  linear_rating: { min: 1, max: 10 },
  nps_rating: { min: 0, max: 10 },
};

export function RatingWidget({ question, field }: RatingWidgetProps) {
  const range = RANGE_BY_TYPE[question.questionType];

  if (!range) {
    return null;
  }

  return <NumericRating range={range} field={field} />;
}

interface NumericRatingProps {
  range: { min: number; max: number };
  field: ControllerRenderProps;
}

function NumericRating({ range, field }: NumericRatingProps) {
  const current = typeof field.value === 'number' ? (field.value as number) : null;
  const values = buildRange(range.min, range.max);

  const handleSelect = useCallback(
    (n: number) => {
      field.onChange(n);
    },
    [field],
  );

  return (
    <div className="grid gap-1 pb-1" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((n, index) => (
        <NumberButton
          key={n}
          value={n}
          isActive={n === current}
          isFormFocusTarget={index === 0}
          onClick={handleSelect}
        />
      ))}
    </div>
  );
}

interface NumberButtonProps {
  value: number;
  isActive: boolean;
  isFormFocusTarget: boolean;
  onClick: (n: number) => void;
}

const NumberButton = memo(function NumberButton({ value, isActive, isFormFocusTarget, onClick }: NumberButtonProps) {
  const handleClick = useCallback(() => onClick(value), [value, onClick]);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={handleClick}
      data-form-focus-target={isFormFocusTarget ? '' : undefined}
      className={cn('h-9 min-w-0 rounded-md border px-0 text-label-14 transition-colors', {
        'bg-card text-foreground hover:bg-accent': !isActive,
        'bg-primary text-primary-foreground border-primary': isActive,
      })}
    >
      {value}
    </button>
  );
});

function buildRange(min: number, max: number): number[] {
  const out: number[] = [];

  for (let i = min; i <= max; i++) {
    out.push(i);
  }

  return out;
}
