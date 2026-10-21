interface AuthFormErrorProps {
  message: string | null;
}

export function AuthFormError({ message }: AuthFormErrorProps) {
  return message ? (
    <p role="alert" className="text-copy-13 text-destructive-text">
      {message}
    </p>
  ) : null;
}
