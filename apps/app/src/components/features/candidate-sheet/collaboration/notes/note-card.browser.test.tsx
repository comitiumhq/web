import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { NoteCard } from './note-card';

const IMAGE_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: (avatarUrl?: string | null) => (avatarUrl ? IMAGE_SRC : null),
}));

describe('NoteCard', () => {
  it('renders the note author avatar when one is available', async () => {
    const screen = await render(
      <NoteCard
        noteId="note-id"
        authorName="Ada Lovelace"
        authorAvatarUrl="/orgs/org/members/user/avatar/version"
        isPrivate={false}
        createdAt="2026-09-06T12:00:00.000Z"
        orgId="org-id"
        isDecrypting
      />,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', IMAGE_SRC);
  });
});
