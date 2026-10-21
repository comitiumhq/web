import { getPasswordStrength } from '@comitium/crypto/password';

import { PasswordStrengthMeter } from './password-strength-meter';

const LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  let label = LABELS[strength.score];
  let color = COLORS[strength.score];
  let level = Math.max(1, strength.score);

  if (strength.error === 'too-short') {
    label = 'Use at least 8 characters.';
    color = 'bg-warning';
    level = Math.min(level, 2);
  } else if (strength.error === 'too-long') {
    label = 'Password is too long.';
    color = 'bg-destructive';
    level = 1;
  }

  return <PasswordStrengthMeter level={level} label={label} color={color} />;
}
