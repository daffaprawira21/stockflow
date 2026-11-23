import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductDetail } from './product-detail';
import { DateDisplay } from '@/components/DateDisplay';

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

  const formatMoney = (value: string) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
    }).format(Number(value));

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{body.data.name}</h1>
          <Link href="/products" className="btn">
            Back to products
          </Link>
        </div>
      </div>

      <div className="card">
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>SKU</dt>
          <dd>{body.data.sku}</dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Description</dt>
          <dd>{body.data.description ?? '—'}</dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Price</dt>
          <dd>{formatMoney(body.data.price)}</dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Stock</dt>
          <dd>{body.data.stock}</dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Status</dt>
          <dd>
            <span
              className={`badge ${body.data.isActive ? 'badge-active' : 'badge-inactive'}`}
            >
              {body.data.isActive ? 'Active' : 'Inactive'}
            </span>
          </dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Created</dt>
          <dd><DateDisplay value={body.data.createdAt} /></dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Updated</dt>
          <dd><DateDisplay value={body.data.updatedAt} /></dd>
        </dl>
      </div>

      <div className="card">
        <ProductDetail id={body.data.id} isActive={body.data.isActive} />
      </div>
    </div>
  );
}
