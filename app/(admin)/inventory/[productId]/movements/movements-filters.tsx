'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
};

export function MovementsFilters({ movementType, page }: MovementsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(params: Record<string, string>) {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    const query = newParams.toString();
    // ponytail: dynamic path not in static Route type; cast is safe, upgrade when
    // the route is registered in generated types.
    router.push((query ? `${pathname}?${query}` : pathname) as never);
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <select
        value={movementType}
        onChange={(event) => updateParams({ movementType: event.target.value, page: '' })}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      >
        <option value="">All movements</option>
        {MOVEMENT_TYPES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {page > 1 ? (
        <button
          type="button"
          className="btn"
          onClick={() => updateParams({ page: String(page - 1) })}
        >
          Prev
        </button>
      ) : null}
      {page > 1 ? (
        <span style={{ color: 'var(--color-ink-muted)', alignSelf: 'center' }}>
          Page {page}
        </span>
      ) : null}
    </div>
  );
}
