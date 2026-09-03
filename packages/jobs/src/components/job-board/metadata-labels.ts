export function formatResponseWindow(days: number): string {
  const noun = days === 1 ? 'day' : 'days';

  return `${days} ${noun}`;
}
