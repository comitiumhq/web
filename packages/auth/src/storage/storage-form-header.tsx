import { BackButton } from '@comitium/ui/back-button';
import { DialogTitle } from '@comitium/ui/dialog';

interface StorageFormHeaderProps {
  title: string;
  description?: string;
  dialog?: boolean;
  pending?: boolean;
  onBack?: () => void;
}

export function StorageFormHeader({ title, description, dialog = false, pending, onBack }: StorageFormHeaderProps) {
  return (
    <header className="grid gap-3">
      {onBack ? <BackButton disabled={pending} onClick={onBack} /> : null}
      <div>
        {dialog ? (
          <DialogTitle className="pr-6 text-heading-20">{title}</DialogTitle>
        ) : (
          <h2 className="text-heading-24">{title}</h2>
        )}
        {description ? <p className="mt-2 text-copy-14 text-muted-foreground">{description}</p> : null}
      </div>
    </header>
  );
}
