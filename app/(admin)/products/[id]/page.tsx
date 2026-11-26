import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductDetail } from './product-detail';
import { Time } from '@/components/Time';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { XIcon } from '@/components/ui/Icons';
import { requireAdmin } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { getProductById } from '@/modules/products/service';
import { ApiError } from '@/lib/api/errors';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  let product;
  try {
    product = await getProductById(prisma, id);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'RESOURCE_NOT_FOUND') {
      notFound();
    }
    redirect('/login');
  }

  const formatMoney = (value: string) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
    }).format(Number(value));

  const status: BadgeStatus = product.isActive ? 'active' : 'inactive';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{product.name}</h1>
        <Link href="/products" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to products
        </Link>
      </div>

      <div
        className="detail-grid-2col"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}
      >
        <div className="card card-flat">
          <h2 className="section-title">Details</h2>
          <dl className="detail-grid">
            <dt>SKU</dt>
            <dd className="tabular-nums">{product.sku}</dd>

            <dt>Description</dt>
            <dd>{product.description ?? '—'}</dd>

            <dt>Price</dt>
            <dd className="tabular-nums">{formatMoney(product.price)}</dd>

            <dt>Stock</dt>
            <dd className="tabular-nums">
              {product.stock}
              {product.stock <= 5 ? (
                <Badge status="low">Low</Badge>
              ) : null}
            </dd>

            <dt>Status</dt>
            <dd>
              <Badge status={status}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
            </dd>

            <dt>Created</dt>
            <dd><Time value={product.createdAt} /></dd>

            <dt>Updated</dt>
            <dd><Time value={product.updatedAt} /></dd>
          </dl>
        </div>

        <div className="card card-flat">
          <ProductDetail id={product.id} isActive={product.isActive} />
        </div>
      </div>
    </div>
  );
}
