import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { CandidateSearchStateProvider, useCandidateSearchState } from './search-state';

interface SearchStateHarnessProps {
  orgId: string;
  visible: boolean;
}

const session = vi.hoisted(() => ({ userId: 'user-1' as string | null, unlocked: true }));
vi.mock('@comitium/auth/use-is-crypto-active', () => ({ useIsCryptoActive: () => session.unlocked }));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ user: session.userId ? { id: session.userId } : null }),
}));

afterEach(() => {
  session.userId = 'user-1';
  session.unlocked = true;
});

function SearchStateHarness({ orgId, visible }: SearchStateHarnessProps) {
  return (
    <StrictMode>
      <CandidateSearchStateProvider orgId={orgId}>{visible && <SearchStateFields />}</CandidateSearchStateProvider>
    </StrictMode>
  );
}

function SearchStateFields() {
  const { name, setName, filters, setFilters } = useCandidateSearchState();
  const location = filters.find((filter) => filter.field === 'location');

  return (
    <>
      <input aria-label="Private search" value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" onClick={() => setFilters([{ field: 'location', cityId: 1, label: 'Warsaw' }])}>
        Apply location
      </button>
      <output aria-label="Applied location">{location?.label ?? ''}</output>
    </>
  );
}

describe('Candidate search state', () => {
  it('retains private search and applied filters when the page unmounts and returns in the same organization', async () => {
    const page = await render(<SearchStateHarness orgId="org-1" visible />);

    await page.getByRole('textbox', { name: 'Private search', exact: true }).fill('Private Name');
    await page.getByRole('button', { name: 'Apply location', exact: true }).click();
    await page.rerender(<SearchStateHarness orgId="org-1" visible={false} />);

    await expect.element(page.getByRole('textbox', { name: 'Private search', exact: true })).not.toBeInTheDocument();

    await page.rerender(<SearchStateHarness orgId="org-1" visible />);

    await expect
      .element(page.getByRole('textbox', { name: 'Private search', exact: true }))
      .toHaveValue('Private Name');

    await expect
      .element(page.getByRole('status', { name: 'Applied location', exact: true }))
      .toHaveTextContent('Warsaw');

    await page.unmount();
  });

  it.each(['lock', 'logout', 'account', 'organization'] as const)(
    'clears retained private values after %s changes while the page is closed',
    async (change) => {
      const page = await render(<SearchStateHarness orgId="org-1" visible />);

      await page.getByRole('textbox', { name: 'Private search', exact: true }).fill('Private Name');
      await page.getByRole('button', { name: 'Apply location', exact: true }).click();
      await page.rerender(<SearchStateHarness orgId="org-1" visible={false} />);

      let orgId = 'org-1';

      if (change === 'lock') {
        session.unlocked = false;
      } else if (change === 'logout') {
        session.userId = null;
      } else if (change === 'account') {
        session.userId = 'user-2';
      } else {
        orgId = 'org-2';
      }

      await page.rerender(<SearchStateHarness orgId={orgId} visible={false} />);
      session.userId = 'user-1';
      session.unlocked = true;
      await page.rerender(<SearchStateHarness orgId="org-1" visible />);

      await expect.element(page.getByRole('textbox', { name: 'Private search', exact: true })).toHaveValue('');
      await expect.element(page.getByRole('status', { name: 'Applied location', exact: true })).toBeEmptyDOMElement();

      await page.unmount();
    },
  );
});
