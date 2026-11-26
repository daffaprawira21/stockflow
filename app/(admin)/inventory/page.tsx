import Link from 'next/link';
import { InventoryFilters } from './inventory-filters';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowUpIcon, PlusIcon } from '@/components/ui/Icons';
import { requireAdmin, parseSearchQuery } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { inventoryListQuerySchema } from '@/modules/inventory/schemas';
import { listInventory } from '@/modules/inventory/service';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = (params.search as string | undefined) ?? '';
  const lowStock = params.lowStock as string | undefined;

  const parsed = parseSearchQuery(params, inventoryListQuerySchema);
  if (!parsed.ok) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Inventory</h1>
          <Link href="/inventory/adjust" className="btn btn-primary">
            <ArrowUpIcon style={{ width: 14, height: 14 }} />
            Adjust stock
          </Link>
        </div>
        <div className="card card-flat">
          <p style={{ color: 'var(--color-ink-muted)' }}>
            The filter query is invalid. Clear the filters and try again.
          </p>
        </div>
      </div>
    );
  }

  const { data: items, meta } = await listInventory(prisma, parsed.query);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <Link href="/inventory/adjust" className="btn btn-primary">
          <ArrowUpIcon style={{ width: 14, height: 14 }} />
          Adjust stock
        </Link>
      </div>

      <div className="card card-flat">
        <InventoryFilters
          search={search}
          lowStock={lowStock ?? ''}
          page={page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
        />

        {items.length === 0 ? (
          <EmptyState
            title="No inventory items found."
            subtitle={
              search
                ? `Nothing matches “${search}”. Try a different search.`
                : 'Items appear here once you create products.'
            }
            action={
              <Link href="/products/create" className="btn btn-primary">
                <PlusIcon style={{ width: 14, height: 14 }} />
                Create product
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Inventory stock levels with SKU, quantity, and status</caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Stock</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status: BadgeStatus = item.isActive ? 'active' : 'inactive';
                  const low = item.stock <= 5;
                  return (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td className="tabular-nums">{item.sku}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {low ? (
                          <span className="low-stock-dot" title="Low stock" />
                        ) : null}
                        {item.stock}
                      </td>
                      <td>
                        <Badge status={status}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                        {low ? <Badge status="low">Low</Badge> : null}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link
                            href={`/inventory/${item.productId}/movements`}
                            className="btn btn-compact"
                          >
                            History
                          </Link>
                          <Link
                            href={`/inventory/adjust?product=${item.productId}`}
                            className="btn btn-compact"
                          >
                            Adjust
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
