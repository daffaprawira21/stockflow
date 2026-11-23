import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { OrderActions } from './order-actions';
import { DateDisplay } from '@/components/DateDisplay';

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

type StatusHistoryEntry = {
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-pending',
  CONFIRMED: 'badge-confirmed',
  SHIPPED: 'badge-shipped',
  CANCELLED: 'badge-cancelled',
};

export default async function OrderPage({
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
  const res = await fetch(`http://127.0.0.1:3000/api/orders/${id}`, {
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
    data: OrderDetail;
  };

  if (!body.success) {
    notFound();
  }

  const order = body.data;

  // Fetch product names for the items table (best-effort; fall back to UUID on failure).
  const productIds = [...new Set(order.items.map((item) => item.productId))];
  const productRefs = new Map<string, string>();
  if (productIds.length > 0) {
    try {
      // ponytail: batch lookup via individual fetches; a products/batch endpoint
      // or a richer order-detail serializer would replace this.
      const results = await Promise.all(
        productIds.map(async (productId) => {
          const pRes = await fetch(`http://127.0.0.1:3000/api/products/${productId}`, {
            cache: 'no-store',
            headers: { cookie: cookieStore.toString() },
          });
          if (!pRes.ok) return [productId, ''] as const;
          const pBody = (await pRes.json()) as { success: boolean; data?: { sku: string; name: string } };
          if (!pBody.success || !pBody.data) return [productId, ''] as const;
          return [productId, `${pBody.data.sku} — ${pBody.data.name}`] as const;
        }),
      );
      results.forEach(([productId, ref]) => {
        if (ref !== '') productRefs.set(productId, ref);
      });
    } catch {
      // Non-fatal: show raw product IDs if the lookup fails.
    }
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {order.orderNumber}
          </h1>
          <Link href="/orders" className="btn">
            Back to orders
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Status</dt>
          <dd>
            <span className={`badge ${STATUS_BADGE[order.status] ?? ''}`}>{order.status}</span>
          </dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Total</dt>
          <dd>{formatMoney(order.totalAmount)}</dd>

          <dt style={{ fontWeight: 600, color: 'var(--color-ink-muted)' }}>Created</dt>
          <dd><DateDisplay value={order.createdAt} /></dd>
        </dl>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0 }}>Items</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>{productRefs.get(item.productId) ?? item.productId}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0 }}>Status history</h2>
        <table className="table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>At</th>
            </tr>
          </thead>
          <tbody>
            {order.statusHistory.map((entry, index) => (
              <tr key={index}>
                <td>{entry.fromStatus}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[entry.toStatus] ?? ''}`}>
                    {entry.toStatus}
                  </span>
                </td>
                <td>{entry.reason ?? '—'}</td>
                <td><DateDisplay value={entry.createdAt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <OrderActions id={order.id} status={order.status} />
      </div>
    </div>
  );
}
