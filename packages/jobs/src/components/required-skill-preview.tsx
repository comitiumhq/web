import type { SkillDisplay } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';

export function RequiredSkillPreview({ skills }: { skills: SkillDisplay[] }) {
  const required = skills.filter((skill) => skill.required);

  if (required.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {required.slice(0, 3).map((skill) => (
        <Badge key={skill.skillId} variant="secondary" className="h-6 px-2 text-label-12 font-normal">
          {skill.label}
        </Badge>
      ))}

      {required.length > 3 && <span className="text-label-12 text-muted-foreground">+{required.length - 3}</span>}
    </div>
  );
}
