import { uuidSchema } from '@comitium/schemas/public';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';

import { InterviewTemplateSettings } from '@/components/features/interview-templates';

const searchSchema = z.object({
  templateId: uuidSchema.optional(),
});

export const Route = createFileRoute('/org/$orgId/organization/interviews/')({
  ssr: false,
  validateSearch: (search) => searchSchema.catch({}).parse(search),
  component: InterviewsSettingsPage,
});

function InterviewsSettingsPage() {
  const { orgId } = Route.useParams();
  const { templateId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleSelectedTemplateChange = useCallback(
    (nextTemplateId: string | null) => {
      navigate({ search: nextTemplateId ? { templateId: nextTemplateId } : {} });
    },
    [navigate],
  );

  return (
    <InterviewTemplateSettings
      orgId={orgId}
      selectedTemplateId={templateId ?? null}
      onSelectedTemplateChange={handleSelectedTemplateChange}
    />
  );
}
