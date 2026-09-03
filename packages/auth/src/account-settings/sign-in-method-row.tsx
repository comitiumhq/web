import type { ReactNode } from 'react';

interface SignInMethodRowProps {
  action: ReactNode;
  error?: string | null;
  icon: ReactNode;
  label: ReactNode;
  note?: string | null;
  value: string;
}

export function SignInMethodRow({ action, error, icon, label, note, value }: SignInMethodRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-copy-14 font-medium">{label}</div>
          <p className="mt-0.5 truncate text-copy-13 text-muted-foreground">{value}</p>
          {note ? <p className="mt-1 text-copy-12 text-muted-foreground">{note}</p> : null}
          {error ? (
            <p role="alert" className="mt-1 text-copy-12 text-destructive-text">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
