import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useCallback, useEffect } from 'react';
import { Button } from './button';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (next: number) => void;
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

  return (
    <div className="flex items-center justify-between text-copy-14 text-muted-foreground">
      <span>
        Showing {start}–{end} of {totalRows}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
          <CaretLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <span className="text-label-14">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages}>
          Next
          <CaretRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
