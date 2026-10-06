import type { SkillDisplay } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';

const SKILL_BADGE_CLASS = 'h-auto min-h-6 max-w-full px-2 py-0.5 text-label-12 font-normal whitespace-normal';

function SkillBadge({ skill }: { skill: SkillDisplay }) {
  return (
    <Badge
      variant={skill.required ? 'secondary' : 'outline'}
      className={skill.required ? SKILL_BADGE_CLASS : `${SKILL_BADGE_CLASS} bg-transparent text-muted-foreground`}
    >
      <span className="min-w-0 break-words">{skill.label}</span>
      {!skill.required && <span className="sr-only">(preferred)</span>}
    </Badge>
  );
}

export function SkillRequirements({ skills }: { skills: SkillDisplay[] }) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <section aria-label="Skills" className="space-y-3">
      <h2 className="text-label-16 font-medium">Skills</h2>

      <ul className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li key={skill.skillId} className="max-w-full">
            <SkillBadge skill={skill} />
          </li>
        ))}
      </ul>
    </section>
  );
}
