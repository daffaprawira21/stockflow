'use client';

import { useSearchParams } from 'next/navigation';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';

type ProductsFiltersProps = {
  search: string;
  isActive: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  totalPages: number;
  totalItems: number;
};

export function ProductsFilters({
  search,
  isActive,
  sortBy,
  sortOrder,
  page,
  totalPages,
  totalItems,
}: ProductsFiltersProps) {
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
    window.location.assign(`/products${qs ? `?${qs}` : ''}`);
  }

  return (
    <div>
      <div className="filter-bar">
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <SearchInput
            value={search}
            placeholder="Search by name or SKU…"
            basePath="/products"
          />
        </div>
        <select
          value={isActive}
          onChange={(e) => setParam('isActive', e.target.value, { page: '' })}
          aria-label="Status"
          style={{ padding: '0.5rem 0.75rem' }}
        >          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split(':');
            setParam('sortBy', field, { sortOrder: direction, page: '' });
          }}
          aria-label="Sort"
          style={{ padding: '0.5rem 0.75rem' }}
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
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/products"
        noun="product"
      />
    </div>
  );
}
