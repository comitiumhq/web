import type { SkillDisplay } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';

export function RequiredSkillPreview({ skills }: { skills: SkillDisplay[] }) {
  const required = skills.filter((skill) => skill.required);
  const visibleSkills = required.slice(0, 2);

  if (required.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {visibleSkills.map((skill) => (
        <Badge
          key={skill.skillId}
          variant="secondary"
          className="h-6 max-w-44 px-2 text-label-12 font-normal"
          title={skill.label}
        >
          <span className="min-w-0 truncate">{skill.label}</span>
        </Badge>
      ))}

      {required.length > visibleSkills.length && (
        <span className="text-label-12 text-muted-foreground">+{required.length - visibleSkills.length}</span>
      )}
    </div>
  );
}
