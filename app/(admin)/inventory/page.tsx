import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InventoryFilters } from './inventory-filters';

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
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Inventory</h1>
          <Link href="/inventory/adjust" className="btn btn-primary">
            Adjust stock
          </Link>
        </div>
      </div>

      <div className="card">
        <InventoryFilters search={search} lowStock={lowStock ?? ''} page={page} />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Movements</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {body.data.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.sku}</td>
                <td>{item.stock}</td>
                <td>
                  <span className={`badge ${item.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <Link href={`/inventory/${item.productId}/movements`} className="btn">
                    History
                  </Link>
                </td>
                <td>
                  <Link href={`/inventory/adjust?product=${item.productId}`} className="btn">
                    Adjust
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {body.meta.totalItems > 0 ? (
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem' }}>
            {body.meta.totalItems} product{body.meta.totalItems === 1 ? '' : 's'}
          </p>
        ) : (
          <p style={{ color: 'var(--color-ink-muted)' }}>No inventory items found.</p>
        )}
      </div>
    </div>
  );
}
