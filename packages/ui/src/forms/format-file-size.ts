const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B';
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(value)}${FILE_SIZE_UNITS[unitIndex]}`;
  }

  return `${value.toFixed(1)}${FILE_SIZE_UNITS[unitIndex]}`;
}
