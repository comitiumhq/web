const SEGMENTS = [1, 2, 3, 4];

interface PasswordStrengthMeterProps {
  level?: number;
  label?: string;
  color?: string;
}

export function PasswordStrengthMeter({
  level = 0,
  label = 'Password strength',
  color = 'bg-border',
}: PasswordStrengthMeterProps) {
  return (
    <div className="flex h-4 items-center gap-3">
      <meter
        aria-label="Password strength"
        min={0}
        max={4}
        value={level}
        aria-valuetext={level === 0 ? 'Not entered' : label}
        className="sr-only"
      >
        {label}
      </meter>
      <div className="flex min-w-0 flex-1 gap-1" aria-hidden="true">
        {SEGMENTS.map((segment) => (
          <span key={segment} className={`h-1 flex-1 rounded-full ${segment <= level ? color : 'bg-border'}`} />
        ))}
      </div>
      <span
        className="w-40 shrink-0 truncate text-right text-copy-12 leading-4 text-muted-foreground"
        aria-live="polite"
      >
        {label}
      </span>
    </div>
  );
}
