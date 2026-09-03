/** Return one or two uppercase initials from a display name. */
export function getNameInitials(name?: string | null, fallback = 'T'): string {
  if (!name) {
    return fallback;
  }

  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length >= 2 ? (words.at(-1)?.[0] ?? '') : '';

  return (first + last).toUpperCase() || fallback;
}
