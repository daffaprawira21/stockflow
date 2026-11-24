'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';

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
  totalPages: number;
  totalItems: number;
};

export function OrdersFilters({
  search,
  status,
  sortBy,
  sortOrder,
  page,
  totalPages,
  totalItems,
}: OrdersFiltersProps) {
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
    router.push((`/orders${qs ? `?${qs}` : ''}`) as never);
  }

  return (
    <div>
      <div className="filter-bar">
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <SearchInput
            value={search}
            placeholder="Search by order number…"
            basePath="/orders"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setParam('status', event.target.value, { page: '' })}
          aria-label="Status"
          style={{ padding: '0.5rem 0.75rem' }}
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
            setParam('sortBy', field, { sortOrder: direction, page: '' });
          }}
          aria-label="Sort"
          style={{ padding: '0.5rem 0.75rem' }}
        >
          <option value="createdAt:desc">Created ↓</option>
          <option value="createdAt:asc">Created ↑</option>
          <option value="orderNumber:desc">Number ↓</option>
          <option value="orderNumber:asc">Number ↑</option>
        </select>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/orders"
        noun="order"
      />
    </div>
  );
}
