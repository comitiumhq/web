/**
 * Stable hooks into @ilamy/calendar's rendered grid. Keeping them here makes
 * the dependency on the library's DOM contract explicit and easy to update.
 */
export const ILAMY_GRID_BODY_SELECTOR = '[data-testid="vertical-grid-body"]';
export const ILAMY_VERTICAL_CELL_SELECTOR = '[data-testid^="vertical-cell-"]';

export const CALENDAR_DRAFT_HEIGHT_PROPERTY = '--calendar-draft-height';
export const CALENDAR_DRAFT_TOP_PROPERTY = '--calendar-draft-top';
