import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useCallback, useEffect } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (next: number) => void;
}

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, 'ellipsis-end', totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', totalPages];
}

export function TablePagination({ page, pageSize, totalRows, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  const handlePrev = useCallback(() => {
    onPageChange(Math.max(1, page - 1));
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(Math.min(totalPages, page + 1));
  }, [page, totalPages, onPageChange]);

  if (totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-copy-14 text-muted-foreground">
      <span className="tabular-nums">
        Showing {start}–{end} of {totalRows}
      </span>
      <nav aria-label="Table pagination" className="flex items-center gap-0.5 rounded-full bg-muted/70 p-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          aria-label="Go to previous page"
          title="Previous page"
          onClick={handlePrev}
          disabled={page === 1}
        >
          <CaretLeftIcon />
        </Button>

        <div className="flex items-center gap-0.5">
          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              <Button
                key={item}
                variant={item === page ? 'default' : 'ghost'}
                size="icon-xs"
                className={cn('rounded-full text-label-12 tabular-nums', item === page && 'shadow-none')}
                aria-label={`Go to page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ) : (
              <span
                key={item}
                className="inline-flex size-6 items-center justify-center text-label-12"
                aria-hidden="true"
              >
                …
              </span>
            ),
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          aria-label="Go to next page"
          title="Next page"
          onClick={handleNext}
          disabled={page === totalPages}
        >
          <CaretRightIcon />
        </Button>
      </nav>
    </div>
  );
}
