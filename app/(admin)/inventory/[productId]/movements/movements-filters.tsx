'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination';

const MOVEMENT_TYPES = [
  'INITIAL_STOCK',
  'ORDER_CONFIRMED',
  'ORDER_CANCELLED',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;

type MovementsFiltersProps = {
  movementType: string;
  page: number;
  totalPages: number;
  totalItems: number;
};

export function MovementsFilters({
  movementType,
  page,
  totalPages,
  totalItems,
}: MovementsFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string, extra?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') params.delete(key);
    else params.set(key, value);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => {
        if (v === '') params.delete(k);
        else params.set(k, v);
      });
    }
    const qs = params.toString();
    // ponytail: dynamic path not in static Route type; cast is safe.
    window.location.assign((qs ? `${pathname}?${qs}` : pathname) as never);
  }

  return (
    <div>
      <div className="filter-bar">
        <select
          value={movementType}
          onChange={(event) => setParam('movementType', event.target.value, { page: '' })}
          aria-label="Movement type"
          style={{ padding: '0.5rem 0.75rem' }}
        >
          <option value="">All movements</option>
          {MOVEMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath={pathname ?? '/inventory'}
        noun="movement"
      />
    </div>
  );
}
