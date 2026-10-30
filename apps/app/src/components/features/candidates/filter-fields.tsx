import { Button } from '@comitium/ui/button';
import { CitySearchInput } from '@comitium/ui/city-search-input';
import { SkillSearchInput } from '@comitium/ui/skill-search-input';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { searchCities } from '@/lib/api/cities';
import { searchSkills } from '@/lib/api/skills';
import { CandidateChoiceSelect, ServerOptions, TagOptions } from './filter-options';
import {
  applyCandidateFilter,
  type CandidateFilter,
  type Choice,
  type ChoiceField,
  FILTER_LABELS,
  type FilterField,
  MAX_FILTER_CHOICES,
  OUTCOMES,
  removeCandidateFilter,
} from './filters';

interface CandidateFilterFieldsProps {
  orgId: string;
  filters: CandidateFilter[];
  onChange: (filters: CandidateFilter[]) => void;
}

interface FilterFieldControlProps {
  field: FilterField;
  hint?: string;
  children: ReactNode;
}

function FilterFieldControl({ field, hint = 'Any of', children }: FilterFieldControlProps) {
  return (
    <div data-filter-field={field} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label-14">{FILTER_LABELS[field]}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  );
}

export function CandidateFilterFields({ orgId, filters, onChange }: CandidateFilterFieldsProps) {
  function choices(field: ChoiceField): Choice[] {
    const filter = filters.find((entry) => entry.field === field);

    return filter && 'choices' in filter ? filter.choices : [];
  }

  function changeChoices(field: ChoiceField, selected: Choice[]) {
    onChange(applyCandidateFilter(filters, { field, choices: selected }));
  }

  const jobs = choices('job');
  const jobId = jobs.length === 1 ? jobs[0]?.id : undefined;
  const location = filters.find((filter) => filter.field === 'location');
  const skills = choices('skills');

  return (
    <div className="flex flex-col gap-4">
      <FilterFieldControl field="job">
        <ServerOptions
          orgId={orgId}
          field="job"
          selected={jobs}
          onChange={(selected) => changeChoices('job', selected)}
        />
      </FilterFieldControl>
      <FilterFieldControl field="department">
        <ServerOptions
          orgId={orgId}
          field="department"
          selected={choices('department')}
          onChange={(selected) => changeChoices('department', selected)}
        />
      </FilterFieldControl>
      <FilterFieldControl field="location" hint="City">
        <CitySearchInput
          searchCities={searchCities}
          value={location?.label ?? ''}
          ariaLabel="Location"
          onCitySelect={(city, label) =>
            onChange(applyCandidateFilter(filters, { field: 'location', cityId: city.id, label }))
          }
          onTextChange={() => onChange(removeCandidateFilter(filters, 'location'))}
        />
      </FilterFieldControl>
      <FilterFieldControl field="skills" hint="All of">
        <SkillSearchInput
          searchSkills={searchSkills}
          excludeIds={skills.map((choice) => choice.id)}
          disabled={skills.length >= MAX_FILTER_CHOICES}
          onSelect={(skill) => changeChoices('skills', [...skills, { id: skill.id, label: skill.label }])}
        />
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.map((skill) => (
              <Button
                type="button"
                key={skill.id}
                variant="secondary"
                size="xs"
                className="max-w-full"
                aria-label={`Remove ${skill.label}`}
                onClick={() =>
                  changeChoices(
                    'skills',
                    skills.filter((choice) => choice.id !== skill.id),
                  )
                }
              >
                <span className="truncate">{skill.label}</span>
                <XIcon />
              </Button>
            ))}
          </div>
        )}
      </FilterFieldControl>
      <FilterFieldControl field="tags" hint="All of">
        <TagOptions orgId={orgId} selected={choices('tags')} onChange={(selected) => changeChoices('tags', selected)} />
      </FilterFieldControl>
      <FilterFieldControl field="stage" hint={jobId ? 'Any of' : 'Select one job first'}>
        <ServerOptions
          key={jobId ?? 'no-job'}
          orgId={orgId}
          field="stage"
          jobId={jobId}
          disabled={!jobId}
          selected={choices('stage')}
          onChange={(selected) => changeChoices('stage', selected)}
        />
      </FilterFieldControl>
      <FilterFieldControl field="source">
        <ServerOptions
          orgId={orgId}
          field="source"
          selected={choices('source')}
          onChange={(selected) => changeChoices('source', selected)}
        />
      </FilterFieldControl>
      <FilterFieldControl field="outcome">
        <CandidateChoiceSelect
          label="Outcome"
          options={OUTCOMES}
          selected={choices('outcome')}
          onChange={(selected) => changeChoices('outcome', selected)}
        />
      </FilterFieldControl>
    </div>
  );
}
