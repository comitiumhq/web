import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import type { CandidateSearchListRow } from '@comitium/schemas/candidate-search';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { PageContainer } from '@comitium/ui/page-container';
import { ListFilterIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCandidateSearchSync } from '@/components/auth/candidate-search-coordinator';
import { type CandidateSheetEntry, CandidateSheetMount } from '@/components/features/candidate-sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { CandidateFilterPanel } from './filter-panel';
import { candidateDefinition } from './filters';
import { CandidateResults } from './results';
import { CandidateSearchBar } from './search-bar';
import { useCandidateSearchState } from './search-state';

interface CandidatesPageProps {
  orgId: string;
}

function sheetEntry(row: CandidateSearchListRow): CandidateSheetEntry {
  const application = row.matchedApplication;

  if (application) {
    return { id: application.applicationId, jobId: application.jobId, jobTitle: application.jobTitle };
  }

  return { candidateId: row.candidateId };
}

export function CandidatesPage({ orgId }: CandidatesPageProps) {
  const sync = useCandidateSearchSync();
  const { filters, setFilters, name, setName } = useCandidateSearchState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedName = useDebounce(name, 200);
  const appliedName = name ? debouncedName : '';
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<CandidateSheetEntry | null>(null);
  const previousScope = useRef<string | null>(null);
  const definition = useMemo(() => candidateDefinition(filters, appliedName), [filters, appliedName]);
  const ready = sync.status?.ready;
  const hasPrivateFilter = Boolean(appliedName.trim() || filters.some((filter) => filter.field === 'location'));
  const privateSession =
    hasPrivateFilter && ready ? `${sync.runtime?.id}:${ready.index.scopeToken}:${ready.index.generation}` : null;

  useEffect(() => {
    const scope = ready?.index.scopeToken;

    if (scope) {
      if (previousScope.current && previousScope.current !== scope) {
        setSelected(null);
        setRevision((value) => value + 1);
      }

      previousScope.current = scope;
    }
  }, [ready?.index.scopeToken]);

  const request = useMemo(
    () => ({ id: crypto.randomUUID(), definition, revision, privateSession }),
    [definition, revision, privateSession],
  );

  const clearPrivate = () => {
    setName('');
    setFilters((current) => current.filter((filter) => filter.field !== 'location'));
  };

  function switchApplication(application: OtherApplicationSummary) {
    setSelected((previous) => {
      if (!previous) {
        return null;
      }

      return { id: application.id, jobId: application.jobId, jobTitle: application.jobTitle };
    });
  }

  return (
    <PageContainer size="workspace" className="flex h-full min-h-0 flex-col gap-4 py-4 sm:py-6">
      <div className="shrink-0">
        <CandidateSearchBar
          text={name}
          onTextChange={setName}
          onClear={() => setName('')}
          filterControl={
            <Button variant="outline" size="lg" onClick={() => setFiltersOpen(true)}>
              <ListFilterIcon />
              Filters
              {filters.length > 0 && <Badge variant="secondary">{filters.length}</Badge>}
            </Button>
          }
        />
      </div>
      <CandidateFilterPanel
        orgId={orgId}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={setFilters}
      />
      <CandidateResults
        orgId={orgId}
        definition={request.definition}
        requestId={request.id}
        restart={() => setRevision((value) => value + 1)}
        clearPrivate={clearPrivate}
        onSelect={(row) => {
          setSelected(sheetEntry(row));
        }}
      />
      <CandidateSheetMount
        selected={selected}
        orgId={orgId}
        onClose={() => setSelected(null)}
        onApplicationSwitch={switchApplication}
      />
    </PageContainer>
  );
}
