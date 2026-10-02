import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { SkillSearchInput } from '@comitium/ui/skill-search-input';
import { XIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import type { PublicJobsApi } from '../../../api';

interface SkillsFilterProps {
  api: PublicJobsApi;
  ids: string[];
  onChange: (ids: string[]) => void;
}

export function SkillsFilter({ api, ids, onChange }: SkillsFilterProps) {
  const lookup = useQuery({
    queryKey: ['skills', 'lookup', ids],
    queryFn: () => api.getSkillsByIds(ids),
    enabled: ids.length > 0,
  });

  const labels = new Map(lookup.data?.data.map((skill) => [skill.id, skill.label]));

  return (
    <div className="space-y-2">
      <div className="text-label-13 font-medium">Skills</div>
      <p className="text-copy-12 text-muted-foreground">Show roles that include every selected skill.</p>
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const label = labels.get(id);

            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1 text-label-12 font-normal">
                {label ?? (lookup.isPending ? 'Loading…' : 'Unknown skill')}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${label ?? 'skill'} filter`}
                  onClick={() => onChange(ids.filter((selected) => selected !== id))}
                >
                  <XIcon />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
      {ids.length < 5 && (
        <SkillSearchInput
          scope="published"
          searchSkills={(query, page) => api.searchSkills(query, page, 'published')}
          onSelect={(skill) => onChange([...ids, skill.id])}
          excludeIds={ids}
          placeholder="Search skills in open roles"
        />
      )}
    </div>
  );
}
