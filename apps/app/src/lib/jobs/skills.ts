import { MAX_POSTING_SKILLS, type SkillRequirement, type SkillSelection } from '@comitium/schemas/skills';

export const POSTING_SKILL_LIMIT_MESSAGE = `Choose no more than ${MAX_POSTING_SKILLS} skills in Posting.`;

export function toSkillSelections(skills: readonly SkillRequirement[]): SkillSelection[] {
  return skills.map(({ skillId, required }) => ({ skillId, required }));
}
