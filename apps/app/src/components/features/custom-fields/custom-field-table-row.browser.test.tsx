import { Table, TableBody } from '@comitium/ui/table';
import { DragDropProvider } from '@dnd-kit/react';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { CustomFieldRow } from '@/lib/schemas/custom-fields';
import { CustomFieldTableRow } from './custom-field-table-row';

const { restore } = vi.hoisted(() => ({ restore: vi.fn() }));

vi.mock('@/hooks/mutations/use-custom-field', () => ({
  useArchiveCustomField: () => ({ isPending: false, mutate: vi.fn() }),
  useRestoreCustomField: () => ({ isPending: false, mutate: restore }),
}));

const field: CustomFieldRow = {
  id: '11111111-1111-4111-8111-111111111111',
  orgId: '22222222-2222-4222-8222-222222222222',
  objectType: 'candidate',
  fieldType: 'short_answer',
  title: 'Platform specialty',
  description: null,
  selectableValues: null,
  isPrivate: false,
  isArchived: true,
  sortOrder: 0,
  createdBy: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-10-30T09:00:00Z',
  updatedAt: '2026-10-30T09:00:00Z',
};

it('keeps Restore accessible when reordering an archived field is disabled', async () => {
  const screen = await render(
    <DragDropProvider>
      <Table>
        <TableBody>
          <CustomFieldTableRow orgId={field.orgId} field={field} index={0} canReorder={false} onEdit={vi.fn()} />
        </TableBody>
      </Table>
    </DragDropProvider>,
  );

  await expect.poll(() => screen.container.querySelector('tr')?.getAttribute('aria-disabled')).not.toBe('true');
  await screen.getByRole('button', { name: `Actions for ${field.title}` }).click();
  await screen.getByRole('menuitem', { name: 'Restore' }).click();

  expect(restore).toHaveBeenCalledWith({ orgId: field.orgId, id: field.id });
});
