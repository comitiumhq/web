import { Alert } from '@comitium/ui/alert';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import type { DraftTab } from './sections';
import type { PublishError } from './utils';

interface PublishValidationBannerProps {
  errors: PublishError[];
  onClickField: (tab: DraftTab) => void;
  onDismiss: () => void;
}

interface ValidationErrorLinkProps {
  error: PublishError;
  isPrefixed: boolean;
  onClickField: (tab: DraftTab) => void;
}

const ValidationErrorLink = memo(function ValidationErrorLink({
  error,
  isPrefixed,
  onClickField,
}: ValidationErrorLinkProps) {
  const handleClick = useCallback(() => {
    onClickField(error.tab);
  }, [error.tab, onClickField]);

  return (
    <span>
      {isPrefixed && ', '}
      <button
        type="button"
        className="cursor-pointer underline underline-offset-2 hover:opacity-80"
        onClick={handleClick}
      >
        {error.label}
      </button>
    </span>
  );
});

export function PublishValidationBanner({ errors, onClickField, onDismiss }: PublishValidationBannerProps) {
  return (
    <div className="px-6 py-3 border-b">
      <Alert variant="destructive" className="relative pr-10">
        <WarningCircleIcon />
        <p className="col-start-2 text-copy-14">
          Complete required fields:{' '}
          {errors.map((error, i) => (
            <ValidationErrorLink key={error.label} error={error} isPrefixed={i > 0} onClickField={onClickField} />
          ))}
        </p>
        <button
          type="button"
          className="absolute right-3 top-3 cursor-pointer text-destructive/60 hover:text-destructive"
          onClick={onDismiss}
        >
          <XIcon className="size-3.5" />
        </button>
      </Alert>
    </div>
  );
}
