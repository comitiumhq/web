import { normalizeCurrencyAnswer } from '@comitium/schemas/forms/answer-values';
import { CURRENCIES } from '@comitium/schemas/job-enums';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

interface CurrencyWidgetProps {
  field: ControllerRenderProps;
}

const DEFAULT_CURRENCY = 'USD';

export function CurrencyWidget({ field }: CurrencyWidgetProps) {
  const value = normalizeCurrencyAnswer(field.value, DEFAULT_CURRENCY);

  const handleAmountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const amount = event.target.value === '' ? undefined : Number(event.target.value);

      field.onChange({ ...value, amount });
    },
    [field, value],
  );

  const handleCurrencyChange = useCallback(
    (currency: string) => {
      field.onChange({ ...value, currency });
    },
    [field, value],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        size="lg"
        placeholder="0.00"
        value={value.amount ?? ''}
        onBlur={field.onBlur}
        onChange={handleAmountChange}
        name={field.name}
        ref={field.ref}
        data-form-focus-target=""
      />
      <Select value={value.currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="h-10 w-full rounded-4xl px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {CURRENCIES.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
