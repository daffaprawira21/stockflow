'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  /** Stable base URL (path only, e.g. "/products") — search params are managed here. */
  basePath: string;
  /** What the items are, for the count label. */
  noun: string;
};

export function Pagination({ page, totalPages, totalItems, basePath, noun }: PaginationProps) {
  const searchParams = useSearchParams();

  function pageUrl(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete('page');
    else params.set('page', String(target));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ''}`;
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        {totalItems} {noun}{totalItems === 1 ? '' : 's'}
      </span>
      <div className="controls">
        <span className="tabular-nums">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Link
          href={pageUrl(page - 1) as never}
          className="btn btn-ghost"
          style={{ padding: '4px 8px' }}
          aria-label="Previous page"
          tabIndex={page <= 1 ? -1 : undefined}
          aria-disabled={page <= 1 || undefined}
        >
          <ChevronLeftIcon style={{ width: 14, height: 14 }} />
        </Link>
        <Link
          href={pageUrl(page + 1) as never}
          className="btn btn-ghost"
          style={{ padding: '4px 8px' }}
          aria-label="Next page"
          tabIndex={page >= totalPages ? -1 : undefined}
          aria-disabled={page >= totalPages || undefined}
        >
          <ChevronRightIcon style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    </nav>
  );
}
