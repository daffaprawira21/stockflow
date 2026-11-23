'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

type ProductsFiltersProps = {
  search: string;
  isActive: string;
  sortBy: string;
  sortOrder: string;
  page: number;
};

export function ProductsFilters({ search, isActive, sortBy, sortOrder, page }: ProductsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(params: Record<string, string>) {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === '' || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    if (!params.page && !params.sortBy && !params.sortOrder) {
      newParams.delete('page');
    }

    router.push(`/products?${newParams.toString()}`);
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <input
        type="search"
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(event) => updateParams({ search: event.target.value })}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      />
      <select
        value={isActive}
        onChange={(event) => updateParams({ isActive: event.target.value })}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      >
        <option value="">All</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      <select
        value={`${sortBy}:${sortOrder}`}
        onChange={(event) => {
          const [field, direction] = event.target.value.split(':');
          updateParams({ sortBy: field, sortOrder: direction, page: '' });
        }}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-ink)',
        }}
      >
        <option value="name:asc">Name ↑</option>
        <option value="name:desc">Name ↓</option>
        <option value="sku:asc">SKU ↑</option>
        <option value="sku:desc">SKU ↓</option>
        <option value="price:asc">Price ↑</option>
        <option value="price:desc">Price ↓</option>
        <option value="stock:asc">Stock ↑</option>
        <option value="stock:desc">Stock ↓</option>
        <option value="createdAt:asc">Created ↑</option>
        <option value="createdAt:desc">Created ↓</option>
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
