export const DEFAULT_CURSOR_PAGE_SIZE = 50;

export function buildCursorSearchParams(limit: number, cursor?: string): URLSearchParams {
  const params = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    params.set('cursor', cursor);
  }

  return params;
}
