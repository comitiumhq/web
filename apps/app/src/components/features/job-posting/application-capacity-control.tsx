import { Input } from '@comitium/ui/input';
import { Switch } from '@comitium/ui/switch';
import { useId } from 'react';
import { isValidApplicationCapacity } from './application-capacity';

interface ApplicationCapacityControlProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function ApplicationCapacityControl({ value, onChange, disabled = false }: ApplicationCapacityControlProps) {
  const inputId = useId();
  const isLimited = value !== null;
  const isValid = isValidApplicationCapacity(value);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-label-14">Limit applications</p>
          <p className="text-copy-13 text-muted-foreground">
            Stop accepting new applications when the limit is reached.
          </p>
        </div>
        <Switch
          checked={isLimited}
          onCheckedChange={(checked) => onChange(checked ? 50 : null)}
          disabled={disabled}
          aria-label="Limit applications"
        />
      </div>

      {isLimited && (
        <div className="space-y-2 border-t border-separator pt-4">
          <label htmlFor={inputId} className="block text-label-13">
            Maximum applications
          </label>
          <Input
            id={inputId}
            type="number"
            min={1}
            max={1000}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            disabled={disabled}
            aria-invalid={!isValid}
            className="h-9 w-28"
          />
          {!isValid && <p className="text-copy-12 text-destructive">Enter a number from 1 to 1000.</p>}
        </div>
      )}
    </div>
  );
}
