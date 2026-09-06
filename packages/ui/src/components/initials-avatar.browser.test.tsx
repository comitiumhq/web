import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { InitialsAvatar } from './initials-avatar';

describe('InitialsAvatar', () => {
  it('renders a supplied image with accessible alt text', async () => {
    const imageSrc =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const screen = await render(
      <InitialsAvatar identity={{ name: 'Ada Lovelace' }} imageSrc={imageSrc} imageAlt="Ada Lovelace" />,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', imageSrc);
  });

  it('uses initials when no image is available', async () => {
    const screen = await render(<InitialsAvatar identity={{ name: 'Ada Lovelace' }} />);

    await expect.element(screen.getByText('AL')).toBeVisible();
  });
});
