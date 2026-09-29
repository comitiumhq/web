import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import type { Control } from 'react-hook-form';

import type { UsdcAmountFormData } from './usdc-amount';

interface UsdcAmountFieldProps {
  control: Control<UsdcAmountFormData>;
  disabled: boolean;
}

export function UsdcAmountField({ control, disabled }: UsdcAmountFieldProps) {
  return (
    <FormField
      control={control}
      name="amount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Amount</FormLabel>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              $
            </span>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="0"
                className="pl-7"
                disabled={disabled}
                {...field}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
