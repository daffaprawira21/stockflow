import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductDetail } from './product-detail';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { XIcon } from '@/components/ui/Icons';

type ProductDetail = {
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const { id } = await params;

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch(`http://127.0.0.1:3000/api/products/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: ProductDetail;
  };

  if (!body.success) {
    notFound();
  }

  const product = body.data;

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
            <dd><DateDisplay value={product.createdAt} /></dd>

            <dt>Updated</dt>
            <dd><DateDisplay value={product.updatedAt} /></dd>
          </dl>
        </div>

        <div className="card card-flat">
          <ProductDetail id={product.id} isActive={product.isActive} />
        </div>
      </div>
    </div>
  );
}
