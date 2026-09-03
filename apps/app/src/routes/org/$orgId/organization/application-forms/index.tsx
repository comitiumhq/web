import { uuidSchema } from '@comitium/schemas/public';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { FormsSettingsList } from '@/components/features/form-builder/forms-settings-list';
import { Permission } from '@/lib/schemas/org';

const searchSchema = z.object({
  form: uuidSchema.optional(),
});

export const Route = createFileRoute('/org/$orgId/organization/application-forms/')({
  ssr: false,
  validateSearch: (search) => searchSchema.catch({}).parse(search),
  component: ApplicationFormsListPage,
});

function ApplicationFormsListPage() {
  const { orgId } = Route.useParams();
  const { form } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleSelectedFormChange = useCallback(
    (next: string | null) => {
      navigate({ search: (prev) => ({ ...prev, form: next ?? undefined }) });
    },
    [navigate],
  );

  return (
    <RoutePermissionGuard permission={Permission.FORM_WRITE} orgId={orgId}>
      <FormsSettingsList
        orgId={orgId}
        formClass="application"
        selectedFormId={form ?? null}
        onSelectedFormChange={handleSelectedFormChange}
      />
    </RoutePermissionGuard>
  );
}
