import type { SkillDisplay } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';

export function SkillRequirements({ skills }: { skills: SkillDisplay[] }) {
  if (skills.length === 0) {
    return null;
  }

  const required = skills.filter((skill) => skill.required);
  const optional = skills.filter((skill) => !skill.required);

  return (
    <section aria-label="Skills" className="space-y-4">
      <h2 className="text-heading-18">Skills</h2>

      {required.length > 0 && (
        <div>
          <h3 className="mb-2 text-label-13 font-medium">Required</h3>
          <div className="flex flex-wrap gap-2">
            {required.map((skill) => (
              <Badge key={skill.skillId} variant="secondary" className="text-label-12 font-normal">
                {skill.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div>
          <h3 className="mb-2 text-label-13 font-medium text-muted-foreground">Optional</h3>
          <div className="flex flex-wrap gap-2">
            {optional.map((skill) => (
              <Badge key={skill.skillId} variant="outline" className="text-label-12 font-normal">
                {skill.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
