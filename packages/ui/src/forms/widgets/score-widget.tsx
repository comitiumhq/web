import { normalizeScoreAnswer } from '@comitium/schemas/forms/answer-values';
import { isDefined } from '@comitium/schemas/guards';
import { cn } from '@comitium/ui/cn';
import { Textarea } from '@comitium/ui/textarea';
import { StarIcon } from '@phosphor-icons/react';
import { type ChangeEvent, memo, useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

interface ScoreWidgetProps {
  field: ControllerRenderProps;
}

const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

export function ScoreWidget({ field }: ScoreWidgetProps) {
  const value = normalizeScoreAnswer(field.value);

  const handleScoreChange = useCallback(
    (score: number) => {
      field.onChange({ ...value, score });
    },
    [field, value],
  );

  const handleCommentChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const comment = event.target.value;

      if (!isDefined(value.score) && comment === '') {
        field.onChange(undefined);

        return;
      }

      field.onChange({ ...value, comment });
    },
    [field, value],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {SCORE_VALUES.map((score, index) => (
          <ScoreButton
            key={score}
            score={score}
            active={isDefined(value.score) && score <= value.score}
            focusTarget={index === 0}
            onSelect={handleScoreChange}
          />
        ))}
      </div>
      <Textarea
        rows={3}
        placeholder="Optional comment..."
        value={value.comment ?? ''}
        onBlur={field.onBlur}
        onChange={handleCommentChange}
        name={`${field.name}-comment`}
      />
    </div>
  );
}

interface ScoreButtonProps {
  score: number;
  active: boolean;
  focusTarget: boolean;
  onSelect: (score: number) => void;
}

const ScoreButton = memo(function ScoreButton({ score, active, focusTarget, onSelect }: ScoreButtonProps) {
  const handleClick = useCallback(() => onSelect(score), [onSelect, score]);

  return (
    <button
      type="button"
      aria-label={`${score} ${score === 1 ? 'star' : 'stars'}`}
      aria-pressed={active}
      onClick={handleClick}
      data-form-focus-target={focusTarget ? '' : undefined}
      className="p-0.5 transition-transform hover:scale-110 active:scale-95"
    >
      <StarIcon
        className={cn('size-6', {
          'fill-primary text-primary': active,
          'text-muted-foreground': !active,
        })}
      />
    </button>
  );
});
