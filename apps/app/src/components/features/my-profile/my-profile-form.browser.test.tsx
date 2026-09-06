import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { OrgMeResponse } from '@/lib/schemas/org';

import { MyProfileForm } from './my-profile-form';

const INITIAL_AVATAR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const mocks = vi.hoisted(() => ({
  avatarMutate: vi.fn(),
  profileMutate: vi.fn(),
}));

vi.mock('@/hooks/mutations/use-update-member-avatar', () => ({
  useUpdateMemberAvatar: () => ({ isPending: false, mutate: mocks.avatarMutate }),
}));

vi.mock('@/hooks/mutations/use-update-member-profile', () => ({
  useUpdateMemberProfile: () => ({ isPending: false, mutate: mocks.profileMutate }),
}));

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: (avatarUrl: string | null) => (avatarUrl ? INITIAL_AVATAR : null),
}));

vi.mock('@/components/tiptap-ui/editor-toolbars', () => ({
  EditorToolbar: () => null,
}));

vi.mock('@/components/tiptap-ui/rich-text-editor', () => ({
  EMPTY_DOC: { type: 'doc', content: [{ type: 'paragraph' }] },
  RichTextEditor: () => null,
}));

const meData: OrgMeResponse = {
  userId: '11111111-1111-4111-8111-111111111111',
  role: 'org_admin',
  permissions: ['org_member:read'],
  name: 'Ada Lovelace',
  jobTitle: 'Recruiter',
  email: 'ada@example.com',
  avatarUrl: '/orgs/org/members/user/avatar/version',
  emailSignature: null,
  timezone: 'Europe/Warsaw',
};

describe('MyProfileForm avatar upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileMutate.mockImplementation((_data, options) => options?.onSuccess?.());
  });

  it('only enables profile save after a change and resets after success', async () => {
    const screen = await render(<MyProfileForm orgId="org" meData={meData} />);
    const saveButton = screen.getByRole('button', { name: 'Save changes' });

    await expect.element(saveButton).toBeDisabled();
    await userEvent.fill(screen.getByRole('textbox', { name: 'Name' }), 'Grace Hopper');
    await expect.element(saveButton).toBeEnabled();
    await saveButton.click();

    expect(mocks.profileMutate).toHaveBeenCalledWith(
      {
        name: 'Grace Hopper',
        jobTitle: 'Recruiter',
        emailSignature: null,
        timezone: 'Europe/Warsaw',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await expect.element(saveButton).toBeDisabled();
  });

  it('keeps the persisted avatar while editing and submits the confirmed crop', async () => {
    const screen = await render(<MyProfileForm orgId="org" meData={meData} />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const imageBytes = Uint8Array.from(atob(INITIAL_AVATAR.split(',')[1] ?? ''), (character) =>
      character.charCodeAt(0),
    );
    const file = new File([imageBytes], 'replacement.png', { type: 'image/png' });

    if (!input) {
      throw new Error('Expected the profile photo input to render');
    }
    await expect.element(screen.getByRole('img', { name: 'Profile photo' })).toHaveAttribute('src', INITIAL_AVATAR);
    await userEvent.upload(input, file);

    expect(document.querySelector<HTMLImageElement>('img[alt="Profile photo"]')?.src).toBe(INITIAL_AVATAR);
    await expect.element(screen.getByRole('button', { name: 'Save photo' })).toBeEnabled();
    (screen.getByRole('button', { name: 'Save photo' }).element() as HTMLButtonElement).click();

    expect(mocks.avatarMutate).toHaveBeenCalledOnce();
    const upload = mocks.avatarMutate.mock.calls[0]?.[0];
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
});
