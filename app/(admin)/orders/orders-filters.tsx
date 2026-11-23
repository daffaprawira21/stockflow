'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

type OrdersFiltersProps = {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: string;
  page: number;
};

export function OrdersFilters({ search, status, sortBy, sortOrder, page }: OrdersFiltersProps) {
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

    router.push(`/orders?${newParams.toString()}`);
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink)',
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <input
        type="search"
        placeholder="Search by order number…"
        value={search}
        onChange={(event) => updateParams({ search: event.target.value, page: '' })}
        style={inputStyle}
      />
      <select
        value={status}
        onChange={(event) => updateParams({ status: event.target.value, page: '' })}
        style={inputStyle}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={`${sortBy}:${sortOrder}`}
        onChange={(event) => {
          const [field, direction] = event.target.value.split(':');
          updateParams({ sortBy: field, sortOrder: direction, page: '' });
        }}
        style={inputStyle}
      >
        <option value="createdAt:desc">Created ↓</option>
        <option value="createdAt:asc">Created ↑</option>
        <option value="orderNumber:desc">Number ↓</option>
        <option value="orderNumber:asc">Number ↑</option>
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
