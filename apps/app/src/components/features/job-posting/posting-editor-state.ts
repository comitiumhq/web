import type { JobPosting, UpdateJobPostingData } from '@comitium/schemas/jobs';
import { MAX_POSTING_SKILLS, type SkillRequirement } from '@comitium/schemas/skills';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import type { AutosaveSnapshot } from '@/hooks/use-autosave';
import { POSTING_SKILL_LIMIT_MESSAGE } from '@/lib/jobs/skills';
import { isValidApplicationCapacity } from './application-capacity';

export type PostingEditorState = Omit<UpdateJobPostingData, 'expectedVersion' | 'skills'> & {
  skills?: SkillRequirement[];
};

/**
 * Map a saved Posting to its editable content and application settings.
 */
export function postingToEditorState(posting: JobPosting): PostingEditorState {
  return {
    description: posting.description,
    skills: posting.skills,
    formId: posting.form?.id ?? null,
    applicationCapacity: posting.applicationCapacity,
  };
}

/**
 * Keep invalid Posting fields local while allowing independent fields to save.
 * Published content retains its publication requirements.
 */
export function preparePostingAutosave(
  data: PostingEditorState,
  posting: JobPosting | undefined,
): AutosaveSnapshot<PostingEditorState> {
  const isPublished = posting?.status === 'published';
  const isDescriptionEmpty = !richTextToPlainText(data.description ?? null);
  const hasTooManySkills = (data.skills?.length ?? 0) > MAX_POSTING_SKILLS;
  const hasRetiredSkills = posting?.skills.some((skill) => skill.status === 'retired');
  const skillsUnchanged = JSON.stringify(data.skills) === JSON.stringify(posting?.skills);
  const blockedKeys: (keyof PostingEditorState)[] = [];
  const validationMessages: Partial<Record<keyof PostingEditorState, string[]>> = {};

  if (isPublished && isDescriptionEmpty) {
    blockedKeys.push('description');

    validationMessages.description = ['Description is required for a published Posting'];
  }

  if (!isValidApplicationCapacity(data.applicationCapacity ?? null)) {
    blockedKeys.push('applicationCapacity');
    validationMessages.applicationCapacity = ['Capacity must be a whole number between 1 and 1,000'];
  }

  if (hasTooManySkills || (hasRetiredSkills && skillsUnchanged)) {
    blockedKeys.push('skills');

    validationMessages.skills = [
      hasTooManySkills ? POSTING_SKILL_LIMIT_MESSAGE : 'Remove or replace retired skills before saving',
    ];
  }

  return { data, blockedKeys, validationMessages };
}
