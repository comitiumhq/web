import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ImageUploader } from './image-uploader';

describe('ImageUploader', () => {
  it('opens file selection from the full empty dropzone', async () => {
    const screen = await render(<ImageUploader label="Company logo" />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const dropzone = screen.getByRole('button', { name: 'Upload company logo' });
    const onInputClick = vi.fn();

    input?.addEventListener('click', onInputClick);
    expect(dropzone.element().tagName).toBe('BUTTON');
    await dropzone.click();

    expect(input).not.toBeNull();
    expect(onInputClick).toHaveBeenCalledOnce();
  });

  it('opens file selection when an existing image is clicked', async () => {
    const screen = await render(<ImageUploader label="Company logo" initialImage="data:image/png;base64,AA==" />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const onInputClick = vi.fn();

    input?.addEventListener('click', onInputClick);
    await screen.getByRole('button', { name: 'Change company logo' }).click();

    expect(onInputClick).toHaveBeenCalledOnce();
  });

  it('removes an existing image without opening file selection', async () => {
    const onImageChange = vi.fn();
    const screen = await render(
      <ImageUploader label="Company logo" initialImage="data:image/png;base64,AA==" onImageChange={onImageChange} />,
    );
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const onInputClick = vi.fn();

    input?.addEventListener('click', onInputClick);
    await screen.getByRole('button', { name: 'Remove company logo' }).click();

    expect(onImageChange).toHaveBeenCalledWith(null);
    expect(onInputClick).not.toHaveBeenCalled();
  });

  it('disables file selection when editing is not allowed', async () => {
    const screen = await render(<ImageUploader label="Company logo" disabled />);

    await expect.element(screen.getByRole('button', { name: 'Upload company logo' })).toBeDisabled();
  });
});
