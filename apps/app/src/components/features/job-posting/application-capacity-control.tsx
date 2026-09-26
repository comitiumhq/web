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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
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
        <div className="space-y-1">
          <label htmlFor={inputId} className="flex items-center justify-between gap-4 text-copy-14">
            <span className="text-muted-foreground">Maximum applications</span>
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
          </label>
          {!isValid && <p className="text-right text-copy-12 text-destructive">Enter a number from 1 to 1000.</p>}
        </div>
      )}
    </div>
  );
}
