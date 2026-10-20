import { ArrowLeftIcon } from 'lucide-react';
import { Button } from './button';

interface BackButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export function BackButton({ disabled, onClick }: BackButtonProps) {
  return (
    <Button type="button" variant="text" className="-ml-3 w-fit text-copy-13" disabled={disabled} onClick={onClick}>
      <ArrowLeftIcon />
      Back
    </Button>
  );
}
