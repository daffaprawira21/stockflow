import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InventoryFilters } from './inventory-filters';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowUpIcon, PlusIcon } from '@/components/ui/Icons';

type InventoryItem = {
  productId: string;
  sku: string;
  productName: string;
  stock: number;
  isActive: boolean;
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = (params.search as string | undefined) ?? '';
  const lowStock = params.lowStock as string | undefined;

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', '10');
  if (search) query.set('search', search);
  if (lowStock !== undefined) query.set('lowStock', lowStock);

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch(`http://127.0.0.1:3000/api/inventory?${query.toString()}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: InventoryItem[];
    meta: { page: number; limit: number; totalItems: number; totalPages: number };
  };

  if (!body.success) {
    redirect('/login');
  }

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
          totalPages={body.meta.totalPages}
          totalItems={body.meta.totalItems}
        />

        {body.data.length === 0 ? (
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
                {body.data.map((item) => {
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
