export function readNonEmptyText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

export function requireNonEmptyText(value: unknown, message: string): string {
  const text = readNonEmptyText(value);

  if (!text) {
    throw new Error(message);
  }

  return text;
}
