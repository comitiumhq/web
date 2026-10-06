import type { SkillSearchResponse } from '@comitium/schemas/skills';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SEARCH_DEBOUNCE_DELAY } from '../lib/config';
import { Button } from './button';
import { Combobox, type ComboboxOption } from './combobox';

export type SkillOption = SkillSearchResponse['data'][number];

interface SkillSearchInputProps {
  searchSkills: (query: string, page: number) => Promise<SkillSearchResponse>;
  onSelect: (skill: SkillOption) => void;
  excludeIds?: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  scope?: string;
}

export function SkillSearchInput({
  searchSkills,
  onSelect,
  excludeIds = [],
  placeholder = 'Search skills',
  disabled = false,
  scope = 'all',
}: SkillSearchInputProps) {
  const [input, setInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(input.trim()), SEARCH_DEBOUNCE_DELAY);

    return () => clearTimeout(timeout);
  }, [input]);

  const results = useInfiniteQuery({
    queryKey: ['skills', scope, debouncedQuery],
    queryFn: ({ pageParam }) => searchSkills(debouncedQuery, pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextPage,
    enabled: open && debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const waitingForQuery = input.trim() !== debouncedQuery;
  const matches = waitingForQuery ? [] : (results.data?.pages.flatMap((page) => page.data) ?? []);
  const availableSkills = matches.filter((skill) => !excludeIds.includes(skill.id));
  const skillsById = new Map(availableSkills.map((skill) => [skill.id, skill]));
  const options: ComboboxOption[] = availableSkills.map((skill) => ({
    value: skill.id,
    label: skill.label,
    trailing: skill.categories.map((category) => category.label).join(' · '),
  }));

  function selectSkill(skillId: string | null) {
    if (!skillId) {
      return;
    }

    const skill = skillsById.get(skillId);

    if (skill) {
      onSelect(skill);
      setInput('');
      setDebouncedQuery('');
      setOpen(false);
    }
  }

  let emptyMessage = 'No skills found.';

  if (waitingForQuery || results.isPending) {
    emptyMessage = 'Searching…';
  } else if (results.isError) {
    emptyMessage = 'Skills could not be loaded.';
  }

  return (
    <Combobox
      serverFiltered
      clearable={false}
      value={null}
      onValueChange={selectSkill}
      options={options}
      inputValue={input}
      onInputValueChange={(value) => {
        setInput(value);
        setOpen(value.trim().length > 0);
      }}
      open={open && input.trim().length > 0}
      onOpenChange={setOpen}
      placeholder={placeholder}
      searchPlaceholder={placeholder}
      ariaLabel={placeholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      contentClassName="max-w-[min(28rem,calc(100vw-2rem))]"
      listFooter={
        !waitingForQuery && results.hasNextPage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => void results.fetchNextPage()}
            disabled={results.isFetchingNextPage}
          >
            {results.isFetchingNextPage ? 'Loading…' : 'Show more'}
          </Button>
        ) : null
      }
    />
  );
}
