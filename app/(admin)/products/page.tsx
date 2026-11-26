import Link from 'next/link';
import { ProductsFilters } from './products-filters';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/Icons';
import { requireAdmin, parseSearchQuery } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { productListQuerySchema } from '@/modules/products/list-query';
import { listProducts } from '@/modules/products/service';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = (params.search as string | undefined) ?? '';
  const isActive = params.isActive as string | undefined;
  const sortBy = (params.sortBy as string | undefined) ?? 'createdAt';
  const sortOrder = (params.sortOrder as string | undefined) ?? 'desc';

  const parsed = parseSearchQuery(params, productListQuerySchema);
  if (!parsed.ok) {
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
          <p style={{ color: 'var(--color-ink-muted)' }}>
            The filter query is invalid. Clear the filters and try again.
          </p>
        </div>
      </div>
    );
  }

  const { data: products, meta } = await listProducts(prisma, parsed.query);

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
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
        />

        {products.length === 0 ? (
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
                {products.map((product) => {
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
