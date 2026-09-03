import type { TipTapDoc } from '@comitium/schemas/common';
import { replaceTipTapTokens, replaceTokensInText, type TokenValues } from '@/lib/tiptap/tokens';

export interface EmailTokenContext {
  candidateFirstName?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  senderName?: string | null;
  stageName?: string | null;
  jobLocation?: string | null;
  interviewDate?: string | null;
  interviewTime?: string | null;
  interviewerName?: string | null;
}

export function containsUnresolvedTemplateToken(value: string): boolean {
  return /{{[^{}]+}}/.test(value);
}

/** Build the `{{token}}` → value map for the email substitution context. */
function buildEmailTokenValues(context: EmailTokenContext): TokenValues {
  const values: TokenValues = {};

  if (context.candidateFirstName) {
    values['{{candidate_first_name}}'] = context.candidateFirstName;
  }

  if (context.jobTitle) {
    values['{{job_title}}'] = context.jobTitle;
  }

  if (context.companyName) {
    values['{{company_name}}'] = context.companyName;
  }

  if (context.senderName) {
    values['{{sender_name}}'] = context.senderName;
  }

  if (context.stageName) {
    values['{{stage_name}}'] = context.stageName;
  }

  if (context.jobLocation) {
    values['{{job_location}}'] = context.jobLocation;
  }

  if (context.interviewDate) {
    values['{{interview_date}}'] = context.interviewDate;
  }

  if (context.interviewTime) {
    values['{{interview_time}}'] = context.interviewTime;
  }

  if (context.interviewerName) {
    values['{{interviewer_name}}'] = context.interviewerName;
  }

  return values;
}

/** Resolve subject + body tokens for an email template. */
export function renderEmailTemplate(
  template: { subject: string; body: TipTapDoc },
  context: EmailTokenContext,
): { subject: string; body: TipTapDoc } {
  const values = buildEmailTokenValues(context);

  return {
    subject: replaceTokensInText(template.subject, values),
    body: replaceTipTapTokens(template.body, values),
  };
}

/** Resolve tokens in editor-produced HTML while escaping dynamic values for an HTML text context. */
export function renderEmailHtml(html: string, context: EmailTokenContext): string {
  const values = buildEmailTokenValues(context);
  const escapedValues = Object.fromEntries(
    Object.entries(values).map(([token, value]) => [token, escapeHtmlText(value)]),
  );

  return replaceTokensInText(html, escapedValues);
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Append email signature paragraphs to a body doc, separated by a blank paragraph. */
export function appendSignature(body: TipTapDoc | null, signature: TipTapDoc | null): TipTapDoc | null {
  if (!signature?.content?.length) {
    return body;
  }

  const bodyContent = body?.content ?? [{ type: 'paragraph' }];

  return {
    type: 'doc',
    content: [...bodyContent, { type: 'paragraph' }, ...signature.content],
  };
}
