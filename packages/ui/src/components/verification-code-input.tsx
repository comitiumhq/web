import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { InputOTP, InputOTPGroup, InputOTPSlot } from './input-otp';

export const VERIFICATION_CODE_LENGTH = 6;

const CODE_SLOTS = Array.from({ length: VERIFICATION_CODE_LENGTH }, (_, index) => index);

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}: VerificationCodeInputProps) {
  return (
    <InputOTP
      aria-label="Verification code"
      maxLength={VERIFICATION_CODE_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      containerClassName="w-full"
      autoFocus={autoFocus}
    >
      <InputOTPGroup className="grid w-full grid-cols-6 gap-2 rounded-none">
        {CODE_SLOTS.map((slotIndex) => (
          <InputOTPSlot key={slotIndex} index={slotIndex} className="h-12 w-full rounded-xl border-l text-heading-16" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
