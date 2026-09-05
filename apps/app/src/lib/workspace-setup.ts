import type { JobCreationContext } from '@comitium/schemas/jobs';
import type { WorkspaceSetup } from '@/lib/schemas/org';

const JOB_CREATION_SETUP_DISABLED_REASON =
  'Complete company details, department, location, and privacy settings first.';
const JOB_CREATION_SETUP_MEMBER_DISABLED_REASON =
  'An organization administrator must finish setup before a job can be created.';

interface JobCreationAvailability {
  hasAccess: boolean;
  canCreate: boolean;
  disabledReason?: string;
}

export function isJobCreationAllowedBySetup(setup: WorkspaceSetup): boolean {
  return (
    setup.required.firstJob.complete ||
    (setup.required.companyDetails.complete &&
      setup.required.department.complete &&
      setup.required.location.complete &&
      setup.required.recruitingPrivacy.complete)
  );
}

export function resolveJobCreationAvailability(
  context: JobCreationContext | undefined,
  isAdmin: boolean,
): JobCreationAvailability {
  if (!context) {
    return { hasAccess: false, canCreate: false };
  }

  const hasAccess = context.orgWide || context.departmentIds.length > 0;
  let disabledReason: string | undefined;

  if (!context.setupAllowsJobCreation) {
    disabledReason = isAdmin ? JOB_CREATION_SETUP_DISABLED_REASON : JOB_CREATION_SETUP_MEMBER_DISABLED_REASON;
  }

  return {
    hasAccess,
    canCreate: hasAccess && context.setupAllowsJobCreation,
    disabledReason,
  };
}
