import { Form } from '@comitium/ui/form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { JobBasicInformationFields } from './job-basic-information-fields';

const mocks = vi.hoisted(() => ({ departments: vi.fn(), locations: vi.fn() }));

vi.mock('@/lib/api/org-structure', () => ({
  getOrgDepartments: mocks.departments,
  getOrgLocations: mocks.locations,
}));

function ReadOnlySettingsForm() {
  const form = useForm<JobSettingsFormData>({
    defaultValues: {
      title: 'Engineer',
      departmentId: '11111111-1111-4111-8111-111111111111',
      locationId: '22222222-2222-4222-8222-222222222222',
    },
  });

  return (
    <Form {...form}>
      <JobBasicInformationFields
        orgId="org"
        form={form}
        structureLabels={{ departmentName: 'Engineering', locationName: 'London' }}
        readOnly
      />
    </Form>
  );
}

describe('Job structure fields', () => {
  it('shows the selected labels read-only without requesting organization catalogs', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <ReadOnlySettingsForm />
      </QueryClientProvider>,
    );
    const team = screen.getByRole('combobox', { name: 'Team', exact: true });
    const location = screen.getByRole('combobox', { name: 'Location', exact: true });

    await expect.element(team).toHaveValue('Engineering');
    await expect.element(team).toBeDisabled();
    await expect.element(location).toHaveValue('London');
    await expect.element(location).toBeDisabled();
    expect(mocks.departments).not.toHaveBeenCalled();
    expect(mocks.locations).not.toHaveBeenCalled();
  });
});
