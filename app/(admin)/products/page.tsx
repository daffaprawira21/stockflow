import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductsFilters } from './products-filters';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/Icons';

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <Link href="/products/create" className="btn btn-primary">
          <PlusIcon style={{ width: 14, height: 14 }} />
          Create product
        </Link>
      </div>

      <div className="card card-flat">
        <ProductsFilters
          search={search}
          isActive={isActive ?? ''}
          sortBy={sortBy}
          sortOrder={sortOrder}
          page={page}
          totalPages={body.meta.totalPages}
          totalItems={body.meta.totalItems}
        />

        {body.data.length === 0 ? (
          <EmptyState
            title="No products found."
            subtitle={
              search
                ? `Nothing matches “${search}”. Try a different search.`
                : 'Create your first product to get started.'
            }
            action={
              <Link href="/products/create" className="btn btn-primary">
                Create product
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Product catalog with SKU, name, price, stock, and status</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Name</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Price</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Stock</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col" style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {body.data.map((product) => {
                  const status: BadgeStatus = product.isActive ? 'active' : 'inactive';
                  return (
                    <tr key={product.id}>
                      <td className="tabular-nums">{product.sku}</td>
                      <td>{product.name}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {formatMoney(product.price)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {product.stock <= 5 ? (
                          <span className="low-stock-dot" title="Low stock" />
                        ) : null}
                        {product.stock}
                      </td>
                      <td>
                        <Badge status={status}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td><DateDisplay value={product.updatedAt} /></td>
                      <td>
                        <Link href={`/products/${product.id}`} className="btn btn-compact">
                          View
                        </Link>
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
