interface ErrorMessageProps {
  message: string | null;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-xl bg-destructive/10 p-3 text-center">
      <p className="text-copy-13 text-destructive-text">{message}</p>
    </div>
  );
}
