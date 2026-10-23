import { ApiError } from '@comitium/schemas/api-errors';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { MyOrg, OrgDetails } from '@/lib/schemas/org';

const mocks = vi.hoisted(() => ({
  data: undefined as OrgDetails | undefined,
  mutate: vi.fn(),
}));

vi.mock('@/hooks/queries/use-query-org', () => ({
  useQueryOrg: () => ({ data: mocks.data, isLoading: false }),
}));
vi.mock('@/hooks/mutations/use-update-org-metadata', () => ({
  useUpdateOrgMetadata: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

import { SettingsForm } from './settings-form';

function renderSettingsForm() {
  return render(
    <TooltipProvider>
      <SettingsForm org={org} />
    </TooltipProvider>,
  );
}

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const org = { id: ORG_ID } as MyOrg;
const details: OrgDetails = {
  id: ORG_ID,
  name: null,
  logo: null,
  description: 'Existing company description',
  website: 'https://acme.com',
  careersSlug: `org-${ORG_ID}`,
  domain: 'acme.com',
  createdAt: '2026-10-23T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.data = { ...details };
});

describe('Company Profile careers URL', () => {
  it('suggests an address until manually edited and preserves hidden profile data when saving', async () => {
    const screen = await renderSettingsForm();
    const name = screen.getByRole('textbox', { name: 'Company name', exact: true });
    const address = screen.getByRole('textbox', { name: 'Careers page URL', exact: true });

    await expect.element(address).toHaveValue('');
    await name.fill('Acme Corp');
    await expect.element(address).toHaveValue('acme-corp');
    await address.fill('acme-team');
    await name.fill('Acme Global');
    await expect.element(address).toHaveValue('acme-team');
    await screen.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect.poll(() => mocks.mutate.mock.calls.length).toBe(1);
    expect(mocks.mutate.mock.calls[0]?.[0]).toMatchObject({
      name: 'Acme Global',
      careersSlug: 'acme-team',
      description: 'Existing company description',
    });

    mocks.mutate.mock.calls[0]?.[1].onError(new ApiError(409, 'Careers page address is already taken'));
    await expect.element(screen.getByText(/This address is already taken/)).toBeVisible();
  });

  it('keeps an established address when renaming and previews the saved page', async () => {
    mocks.data = { ...details, name: 'Acme Corp', careersSlug: 'acme-corp' };
    const screen = await renderSettingsForm();
    const address = screen.getByRole('textbox', { name: 'Careers page URL', exact: true });

    await screen.getByRole('textbox', { name: 'Company name', exact: true }).fill('Acme Global');
    await expect.element(address).toHaveValue('acme-corp');
    await address.fill('acme-global');
    await expect
      .element(screen.getByRole('link', { name: 'View careers page', exact: true }))
      .toHaveAttribute('href', 'http://localhost:3002/careers/acme-corp');
  });
});
