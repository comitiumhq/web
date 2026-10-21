import { Button } from '@comitium/ui/button';

interface ResendCodeButtonProps {
  remaining: number;
  disabled: boolean;
  sending?: boolean;
  onClick: () => void;
}

export function ResendCodeButton({ remaining, disabled, sending = false, onClick }: ResendCodeButtonProps) {
  let label = 'Resend code';

  if (sending) {
    label = 'Sending…';
  } else if (remaining > 0) {
    label = `Resend in ${remaining}s`;
  }

  return (
    <Button
      type="button"
      variant="text"
      size="sm"
      className="mx-auto px-0 text-copy-13"
      disabled={disabled || remaining > 0}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
