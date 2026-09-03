import { Button } from '@comitium/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';

interface AddMyFeedbackRowProps {
  onSubmit: (() => void) | null;
}

export const AddMyFeedbackRow = memo(function AddMyFeedbackRow({ onSubmit }: AddMyFeedbackRowProps) {
  const handleClick = useCallback(() => onSubmit?.(), [onSubmit]);

  return (
    <div className="px-4 py-2.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={handleClick}
        disabled={onSubmit === null}
      >
        <PlusIcon data-icon="inline-start" />
        Add my feedback
      </Button>
    </div>
  );
});
