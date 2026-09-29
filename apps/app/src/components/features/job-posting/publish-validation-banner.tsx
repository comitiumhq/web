import { Alert } from '@comitium/ui/alert';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';

export interface PublishValidationError<TTarget extends string> {
  label: string;
  target: TTarget;
}

interface PublishValidationBannerProps<TTarget extends string> {
  errors: PublishValidationError<TTarget>[];
  onClickField: (target: TTarget) => void;
  onDismiss: () => void;
}

export function PublishValidationBanner<TTarget extends string>({
  errors,
  onClickField,
  onDismiss,
}: PublishValidationBannerProps<TTarget>) {
  return (
    <div className="border-b border-separator px-6 py-3">
      <Alert variant="destructive" className="relative pr-10">
        <WarningCircleIcon />
        <p className="col-start-2 text-copy-14">
          Complete required fields:{' '}
          {errors.map((error, index) => (
            <span key={`${error.target}:${error.label}`}>
              {index > 0 && ', '}
              <button
                type="button"
                className="cursor-pointer underline underline-offset-2 hover:opacity-80"
                onClick={() => onClickField(error.target)}
              >
                {error.label}
              </button>
            </span>
          ))}
        </p>
        <button
          type="button"
          className="absolute right-3 top-3 cursor-pointer text-destructive/60 hover:text-destructive"
          onClick={onDismiss}
          aria-label="Dismiss validation errors"
        >
          <XIcon className="size-3.5" />
        </button>
      </Alert>
    </div>
  );
}
