export function AuthFormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-copy-13 text-destructive-text">
      {message}
    </p>
  ) : null;
}
