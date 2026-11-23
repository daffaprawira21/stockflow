import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductsFilters } from './products-filters';

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = (params.search as string | undefined) ?? '';
  const isActive = params.isActive as string | undefined;
  const sortBy = (params.sortBy as string | undefined) ?? 'createdAt';
  const sortOrder = (params.sortOrder as string | undefined) ?? 'desc';

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', '10');
  if (search) query.set('search', search);
  if (isActive === 'true' || isActive === 'false') query.set('isActive', isActive);
  query.set('sortBy', sortBy);
  query.set('sortOrder', sortOrder);

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch(`http://127.0.0.1:3000/api/products?${query.toString()}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: Product[];
    meta: { page: number; limit: number; totalItems: number; totalPages: number };
  };

  if (!body.success) {
    redirect('/login');
  }

  const formatMoney = (value: string) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
    }).format(Number(value));

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(value));

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Products</h1>
          <Link href="/products/create" className="btn btn-primary">
            Create product
          </Link>
        </div>
      </div>

      <div className="card">
        <ProductsFilters
          search={search}
          isActive={isActive ?? ''}
          sortBy={sortBy}
          sortOrder={sortOrder}
          page={page}
        />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {body.data.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{formatMoney(product.price)}</td>
                <td>{product.stock}</td>
                <td>
                  <span
                    className={`badge ${product.isActive ? 'badge-active' : 'badge-inactive'}`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{formatDate(product.updatedAt)}</td>
                <td>
                  <Link href={`/products/${product.id}`} className="btn">
                    View
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
          <p style={{ color: 'var(--color-ink-muted)' }}>No products found.</p>
        )}
      </div>
    </div>
  );
}
