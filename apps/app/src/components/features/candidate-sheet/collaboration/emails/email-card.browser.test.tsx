import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ActivityFeedRow, DecryptedEmail, EmailPayload } from '@/lib/schemas/emails';

import { EmailFeedCard } from '../feed/email-feed-card';
import { EmailCard } from './email-card';
import '../../../../../../public/globals.css';

vi.mock('@/hooks/queries/use-query-org', () => ({
  useQueryOrg: () => ({ data: { name: 'Comitium' } }),
}));

const body =
  'I built <Project>.\n\nNext week works for me.\n\n----------------\nTo: candidate@example.com;\nSubject: Interview details;';
const email: DecryptedEmail = {
  id: 'email-1',
  senderRole: 'applicant',
  senderName: null,
  content: { subject: 'Re: Interview details', body },
  createdAt: '2026-10-29T21:43:41Z',
};

const event: ActivityFeedRow & { payload: EmailPayload } = {
  id: 'event-1',
  type: 'email_received',
  createdAt: email.createdAt,
  scope: 'application',
  applicationId: 'application-1',
  jobId: 'job-1',
  jobTitle: 'Product Engineer',
  actor: { userId: null, name: null, avatarUrl: null },
  actorRole: 'applicant',
  metadata: {},
  payload: {
    kind: 'email',
    emailId: email.id,
    content: { v: 1, purpose: 'email_content', zip: 'none', ct: '', iv: '', keys: [] },
  },
};

function message(surface: 'Emails' | 'Feed', value = email) {
  return surface === 'Emails' ? (
    <EmailCard orgId="org-1" email={value} candidateProfile={null} />
  ) : (
    <EmailFeedCard
      event={event}
      orgId="org-1"
      selectedApplicationId="application-1"
      decryptedEmail={value}
      isDecrypting={false}
      decryptionError={false}
      candidateProfile={null}
    />
  );
}

describe.each(['Emails', 'Feed'] as const)('%s inbound email', (surface) => {
  it('shows the receiving organization and preserves the complete plain-text message', async () => {
    const screen = await render(message(surface));

    await expect.element(screen.getByText('to: Comitium', { exact: true })).toBeVisible();
    await expect.element(screen.getByText(body, { exact: true })).toBeVisible();
    expect(screen.getByText(body, { exact: true }).element().textContent).toBe(body);
    expect(getComputedStyle(screen.getByText(body, { exact: true }).element()).whiteSpace).toBe('pre-wrap');
  });
});

it('retains the recorded recipient and rich text for outgoing email', async () => {
  const screen = await render(
    message('Emails', {
      ...email,
      senderRole: 'org_member',
      senderName: 'Recruiter',
      content: {
        subject: 'Interview details',
        to: 'candidate@example.com',
        body: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'See you next week.' }] }],
        },
      },
    }),
  );

  await expect.element(screen.getByText('to: candidate@example.com', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('See you next week.', { exact: true })).toBeVisible();
});
