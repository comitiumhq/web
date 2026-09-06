import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ProfilePhotoField } from './profile-photo-field';

const VALID_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function pngFile() {
  const bytes = Uint8Array.from(atob(VALID_PNG), (character) => character.charCodeAt(0));

  return new File([bytes], 'avatar.png', { type: 'image/png' });
}

const defaultProps = {
  imageSrc: null,
  maxSize: 5 * 1024 * 1024,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
};

describe('ProfilePhotoField', () => {
  it('opens a circular crop editor and only emits the upload after confirmation', async () => {
    const onChange = vi.fn();
    const screen = await render(<ProfilePhotoField {...defaultProps} onChange={onChange} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const file = pngFile();

    if (!input) {
      throw new Error('Expected the profile photo input to render');
    }

    await userEvent.upload(input, file);

    await expect.element(screen.getByRole('heading', { name: 'Crop profile photo' })).toBeVisible();
    await expect.element(screen.getByRole('slider', { name: 'Zoom photo' })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await expect.element(screen.getByRole('button', { name: 'Save photo' })).toBeEnabled();
    (screen.getByRole('button', { name: 'Save photo' }).element() as HTMLButtonElement).click();

    expect(onChange).toHaveBeenCalledOnce();
    const upload = onChange.mock.calls[0]?.[0];
    expect(upload.file).toMatchObject({ name: file.name, size: file.size, type: file.type });
    expect(upload.crop).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(upload.crop.x + upload.crop.width).toBeLessThanOrEqual(1);
    expect(upload.crop.y + upload.crop.height).toBeLessThanOrEqual(1);
  });

  it('discards an unconfirmed crop', async () => {
    const onChange = vi.fn();
    const screen = await render(<ProfilePhotoField {...defaultProps} onChange={onChange} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) {
      throw new Error('Expected the profile photo input to render');
    }

    await userEvent.upload(input, pngFile());
    (screen.getByRole('button', { name: 'Cancel' }).element() as HTMLButtonElement).click();

    await expect.element(screen.getByRole('heading', { name: 'Crop profile photo' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file before opening the editor', async () => {
    const onChange = vi.fn();
    const screen = await render(<ProfilePhotoField {...defaultProps} onChange={onChange} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) {
      throw new Error('Expected the profile photo input to render');
    }

    await userEvent.upload(input, new File(['gif'], 'avatar.gif', { type: 'image/gif' }));

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Use PNG, JPEG, WEBP.');
    expect(screen.getByRole('heading', { name: 'Crop profile photo' }).query()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the avatar itself as the file picker control', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <ProfilePhotoField {...defaultProps} imageSrc={`data:image/png;base64,${VALID_PNG}`} onChange={onChange} />,
    );
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) {
      throw new Error('Expected the profile photo input to render');
    }
    const clickInput = vi.spyOn(input, 'click').mockImplementation(() => undefined);

    await screen.getByRole('button', { name: 'Change profile photo' }).click();

    expect(clickInput).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});
