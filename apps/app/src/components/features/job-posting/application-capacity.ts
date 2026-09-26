export function isValidApplicationCapacity(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 1000);
}
