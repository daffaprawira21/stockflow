'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';

type InventoryFiltersProps = {
  search: string;
  lowStock: string;
  page: number;
  totalPages: number;
  totalItems: number;
};

export function InventoryFilters({
  search,
  lowStock,
  page,
  totalPages,
  totalItems,
}: InventoryFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

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
    router.push((`/inventory${qs ? `?${qs}` : ''}`) as never);
  }

  return (
    <div>
      <div className="filter-bar">
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <SearchInput
            value={search}
            placeholder="Search by name or SKU…"
            basePath="/inventory"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor="low-stock"
            style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 500 }}
          >
            Low stock ≤
          </label>
          <input
            id="low-stock"
            type="number"
            min="0"
            step="1"
            value={lowStock}
            onChange={(event) => setParam('lowStock', event.target.value, { page: '' })}
            style={{ width: 80 }}
          />
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/inventory"
        noun="item"
      />
    </div>
  );
}
