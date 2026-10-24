import { Form } from '@comitium/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import { JobCompensationFields } from './job-compensation-fields';

function CompensationForm() {
  const form = useForm<JobSettingsFormData>({
    resolver: zodResolver(JobSettingsFormSchema),
    defaultValues: {
      title: 'Engineer',
      compensationDisplayMode: 'inherit',
      compensationMin: 50_000,
      compensationMax: 80_000,
      compensationCurrency: 'USD',
      compensationPeriod: 'year',
    },
  });

  return (
    <Form {...form}>
      <JobCompensationFields form={form} />
    </Form>
  );
}

describe('Job compensation', () => {
  it('searches all currencies and preserves the range when disclosure changes', async () => {
    const screen = await render(<CompensationForm />);
    const currency = screen.getByRole('combobox', { name: 'Currency', exact: true });

    await currency.fill('UAH');
    await screen.getByRole('option', { name: 'UAH (₴)', exact: true }).click();
    await expect.element(currency).toHaveValue('UAH (₴)');
    await screen.getByRole('combobox', { name: 'Compensation disclosure' }).click();
    await screen.getByRole('option', { name: 'Not disclosed', exact: true }).click();
    await expect.element(screen.getByRole('textbox', { name: 'Minimum compensation' })).not.toBeInTheDocument();
    await screen.getByRole('combobox', { name: 'Compensation disclosure' }).click();
    await screen.getByRole('option', { name: 'Salary range', exact: true }).click();
    await expect.element(screen.getByRole('textbox', { name: 'Minimum compensation' })).toHaveValue('50,000');
    await expect.element(screen.getByRole('textbox', { name: 'Maximum compensation' })).toHaveValue('80,000');
    await expect.element(currency).toHaveValue('UAH (₴)');
  });
});
