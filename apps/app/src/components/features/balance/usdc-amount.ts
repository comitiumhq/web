import { parseWholeUsdInputToNumber, wholeUsdToUsdcUnits } from '@comitium/chain/usdc';
import { z } from 'zod';

const USDC_AMOUNT_VALIDATION_MESSAGE = 'Enter a whole-dollar amount';

export const usdcAmountFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((value) => parseUsdcAmountInput(value) !== null, USDC_AMOUNT_VALIDATION_MESSAGE),
});

export type UsdcAmountFormData = z.infer<typeof usdcAmountFormSchema>;

export function parseUsdcAmountInput(value: string): bigint | null {
  const amount = parseWholeUsdInputToNumber(value);

  if (amount === null || amount <= 0) {
    return null;
  }

  return wholeUsdToUsdcUnits(amount);
}
