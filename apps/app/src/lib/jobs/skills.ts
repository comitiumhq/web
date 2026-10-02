import type { SkillRequirement, SkillSelection } from '@comitium/schemas/skills';

export function toSkillSelections(skills: readonly SkillRequirement[]): SkillSelection[] {
  return skills.map(({ skillId, required }) => ({ skillId, required }));
}
