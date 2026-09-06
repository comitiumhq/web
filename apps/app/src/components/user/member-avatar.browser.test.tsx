import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { MemberAvatar } from './member-avatar';

const imageSrc =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: (avatarUrl?: string | null) => (avatarUrl ? imageSrc : null),
}));

describe('MemberAvatar', () => {
  it('renders the authenticated image when the member has an avatar URL', async () => {
    const screen = await render(
      <MemberAvatar identity={{ name: 'Ada Lovelace', avatarUrl: '/orgs/org/members/user/avatar/version' }} />,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', imageSrc);
  });

  it('falls back to member initials when no avatar is stored', async () => {
    const screen = await render(<MemberAvatar identity={{ name: 'Ada Lovelace', avatarUrl: null }} />);

    await expect.element(screen.getByText('AL')).toBeVisible();
  });
});
