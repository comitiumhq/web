import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { SearchIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface CandidateSearchBarProps {
  text: string;
  onTextChange: (text: string) => void;
  onClear: () => void;
  filterControl: ReactNode;
}

export function CandidateSearchBar({ text, onTextChange, onClear, filterControl }: CandidateSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <search className="min-w-0 max-w-xl flex-1">
        <InputGroup className="h-10">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            role="searchbox"
            aria-label="Search candidates"
            placeholder="Search..."
            maxLength={200}
            autoComplete="off"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
          />
          {text && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={onClear}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </search>
      {filterControl}
    </div>
  );
}
