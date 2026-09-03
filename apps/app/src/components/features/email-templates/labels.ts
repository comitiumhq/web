import type { EmailTemplateUseCase } from '@/lib/schemas/emails';

export const EMAIL_TEMPLATE_USE_CASE_LABELS: Record<EmailTemplateUseCase, string> = {
  general: 'General',
  application_confirmation: 'Application confirmation',
  referral_confirmation: 'Referral confirmation',
  rejection: 'Rejection',
  application_hired: 'Candidate hired',
  application_withdrew: 'Candidate withdrew',
  application_unresponsive: 'Candidate unresponsive',
  application_transferred: 'Candidate transferred',
  application_outcome_corrected: 'Candidate decision corrected',
  interview_confirmation: 'Interview confirmation',
};
