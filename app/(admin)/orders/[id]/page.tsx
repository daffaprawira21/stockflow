import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { OrderActions } from './order-actions';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { XIcon } from '@/components/ui/Icons';

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

const STATUS_META: Record<string, { status: BadgeStatus }> = {
  PENDING: { status: 'pending' },
  CONFIRMED: { status: 'confirmed' },
  SHIPPED: { status: 'shipped' },
  CANCELLED: { status: 'cancelled' },
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

  const statusMeta = STATUS_META[order.status] ?? {
    status: 'inactive' as BadgeStatus,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{order.orderNumber}</h1>
        <Link href="/orders" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to orders
        </Link>
      </div>

      <div
        className="detail-grid-2col"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Left: items + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card card-flat">
            <h2 className="section-title">Items</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <caption className="sr-only">Order line items with quantity, unit price, and subtotal</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Qty</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Unit price</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td>{productRefs.get(item.productId) ?? item.productId}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {item.quantity}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatMoney(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card-flat">
            <h2 className="section-title">Status history</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <caption className="sr-only">Order status transition history</caption>
                <thead>
                  <tr>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                    <th scope="col">Reason</th>
                    <th scope="col">At</th>
                  </tr>
                </thead>
                <tbody>
                  {order.statusHistory.map((entry, index) => {
                    const toMeta = STATUS_META[entry.toStatus] ?? {
                      status: 'inactive' as BadgeStatus,
                    };
                    return (
                      <tr key={index}>
                        <td>{entry.fromStatus}</td>
                        <td>
                          <Badge status={toMeta.status}>{entry.toStatus}</Badge>
                        </td>
                        <td>{entry.reason ?? '—'}</td>
                        <td><DateDisplay value={entry.createdAt} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: summary + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card card-flat">
            <h2 className="section-title">Summary</h2>
            <dl className="detail-grid">
              <dt>Status</dt>
              <dd>
                <Badge status={statusMeta.status}>{order.status}</Badge>
              </dd>

              <dt>Total</dt>
              <dd className="tabular-nums" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                {formatMoney(order.totalAmount)}
              </dd>

              <dt>Created</dt>
              <dd><DateDisplay value={order.createdAt} /></dd>
            </dl>
          </div>

          <div className="card card-flat">
            <OrderActions id={order.id} status={order.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
