import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { ExpandableContent, ExpandableText } from './expandable-content';

describe('ExpandableContent', () => {
  it('reveals overflowing plain text on demand', async () => {
    const screen = await render(
      <div style={{ width: 120, lineHeight: '20px' }}>
        <ExpandableText collapsedLines={2}>
          This answer contains enough words to wrap across several lines in a narrow preview before it is expanded.
        </ExpandableText>
      </div>,
    );

    const showMore = screen.getByRole('button', { name: 'Show more' });
    await expect.element(showMore).toHaveAttribute('aria-expanded', 'false');

    await showMore.click();

    await expect.element(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports overflowing block content', async () => {
    const screen = await render(
      <div style={{ lineHeight: '20px' }}>
        <ExpandableContent collapsedLines={2}>
          <div style={{ height: 160 }}>Rich content</div>
        </ExpandableContent>
      </div>,
    );

    await expect.element(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });
});
