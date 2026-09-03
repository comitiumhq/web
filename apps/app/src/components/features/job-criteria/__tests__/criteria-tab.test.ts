import { DragDropProvider } from '@dnd-kit/react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  MAX_EVALUATION_CRITERION_PROMPT_LENGTH,
  MAX_EVALUATION_CRITERION_TITLE_LENGTH,
} from '@/lib/jobs/evaluation-criteria';
import { CriterionRow } from '../criterion-row';

describe('CriteriaTab', () => {
  it('enforces title and prompt length in the expanded editor row', () => {
    const html = renderToStaticMarkup(
      createElement(
        DragDropProvider,
        null,
        createElement(CriterionRow, {
          id: 'criterion-1',
          index: 0,
          criterion: {
            id: '00000000-0000-4000-8000-000000000001',
            title: 'React experience',
            prompt: 'Has built production React applications.',
          },
          isExpanded: true,
          onToggle: () => {},
          onUpdate: () => {},
          onRemove: () => {},
        }),
      ),
    );

    expect(html).toContain(`maxLength="${MAX_EVALUATION_CRITERION_TITLE_LENGTH}"`);
    expect(html).toContain(`maxLength="${MAX_EVALUATION_CRITERION_PROMPT_LENGTH}"`);
  });
});
