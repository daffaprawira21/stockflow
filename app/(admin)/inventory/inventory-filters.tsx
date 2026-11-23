'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type InventoryFiltersProps = {
  search: string;
  lowStock: string;
  page: number;
};

export function InventoryFilters({ search, lowStock, page }: InventoryFiltersProps) {
  const router = useRouter();
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

    router.push(`/inventory?${newParams.toString()}`);
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <input
        type="search"
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(event) => updateParams({ search: event.target.value, page: '' })}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      />
      <input
        type="number"
        min="0"
        step="1"
        placeholder="Low stock ≤"
        value={lowStock}
        onChange={(event) => updateParams({ lowStock: event.target.value, page: '' })}
        style={{
          width: '8rem',
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      />
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
