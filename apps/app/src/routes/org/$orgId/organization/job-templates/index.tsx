import { uuidSchema } from '@comitium/schemas/public';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { JobTemplateSettings } from '@/components/features/job-templates';

const searchSchema = z.object({
  templateId: uuidSchema.optional(),
});

export const Route = createFileRoute('/org/$orgId/organization/job-templates/')({
  ssr: false,
  validateSearch: (search) => searchSchema.catch({}).parse(search),
  component: JobTemplatesSettingsPage,
});

function JobTemplatesSettingsPage() {
  const { orgId } = Route.useParams();
  const { templateId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleOpenTemplate = useCallback(
    (id: string) => {
      navigate({ search: { templateId: id } });
    },
    [navigate],
  );

  const handleClose = useCallback(() => {
    navigate({ search: {} });
  }, [navigate]);

  return (
    <JobTemplateSettings
      orgId={orgId}
      activeTemplateId={templateId ?? null}
      onOpenTemplate={handleOpenTemplate}
      onClose={handleClose}
    />
  );
}
