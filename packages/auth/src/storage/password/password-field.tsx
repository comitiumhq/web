import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { Label } from '@comitium/ui/label';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { type ComponentProps, lazy, Suspense, useCallback, useState } from 'react';

import { PasswordStrengthMeter } from './password-strength-meter';

const PasswordStrength = lazy(() => import('./password-strength'));

interface PasswordFieldProps extends ComponentProps<typeof InputGroupInput> {
  id: string;
  label: string;
  value: string;
  showStrength?: boolean;
}

export function PasswordField({ id, label, showStrength = false, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleVisibility = useCallback(() => setVisible((value) => !value), []);
  const password = props.value;
  const strengthId = `${id}-strength`;
  const describedBy = [props['aria-describedby'], showStrength ? strengthId : null].filter(Boolean).join(' ');

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup className="h-10">
        <InputGroupInput
          {...props}
          id={id}
          size="lg"
          type={visible ? 'text' : 'password'}
          aria-describedby={describedBy || undefined}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
            disabled={props.disabled}
            onClick={toggleVisibility}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {showStrength ? (
        <div id={strengthId}>
          {password ? (
            <Suspense fallback={<PasswordStrengthMeter />}>
              <PasswordStrength password={password} />
            </Suspense>
          ) : (
            <PasswordStrengthMeter />
          )}
        </div>
      ) : null}
    </div>
  );
}
