import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { CompanyAvatar } from './company-avatar';

const IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('CompanyAvatar', () => {
  it('renders the supplied logo directly with its organization name', async () => {
    const screen = await render(<CompanyAvatar name="Comitium" logo={IMAGE} />);

    await expect.element(screen.getByRole('img', { name: 'Comitium' })).toHaveAttribute('src', IMAGE);
  });

  it('shows initials when the logo is absent or fails to load', async () => {
    const absent = await render(<CompanyAvatar name="Comitium" />);

    await expect.element(absent.getByText('CO')).toBeVisible();
    await absent.unmount();

    const failed = await render(<CompanyAvatar name="Example" logo="data:image/png;base64,invalid" />);

    await expect.element(failed.getByText('EX')).toBeVisible();
  });

  it('shows initials when a logo is cleared during loading', async () => {
    const screen = await render(<CompanyAvatar name="Comitium" logo="data:image/png;base64,invalid" />);

    await screen.rerender(<CompanyAvatar name="Comitium" logo={null} />);

    await expect.element(screen.getByText('CO')).toBeVisible();
  });

  it('shows initials after removing a loaded logo', async () => {
    const screen = await render(<CompanyAvatar name="Comitium" logo={IMAGE} />);

    await expect.element(screen.getByRole('img', { name: 'Comitium' })).toBeVisible();
    await screen.rerender(<CompanyAvatar name="Comitium" logo={null} />);

    await expect.element(screen.getByText('CO')).toBeVisible();
  });

  it('hides decorative logos from assistive technology', async () => {
    const screen = await render(<CompanyAvatar name="Comitium" logo={IMAGE} decorative />);

    await expect.element(screen.getByAltText('')).toHaveAttribute('alt', '');
  });
});
