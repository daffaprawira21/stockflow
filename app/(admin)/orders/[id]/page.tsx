import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { OrderActions } from './order-actions';
import { Time } from '@/components/Time';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { XIcon } from '@/components/ui/Icons';
import { requireAdmin } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { getOrderById } from '@/modules/orders/service';
import { ApiError } from '@/lib/api/errors';

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  productLabel?: string;
};

type StatusHistoryEntry = {
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: Date;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
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
  await requireAdmin();
  const { id } = await params;

  let order: OrderDetail;
  try {
    order = await getOrderById(prisma, id);
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
                      {/* Product name enriched in the order-detail query; fall
                          back to the raw UUID only if the product is gone. */}
                      <td>{item.productLabel ?? item.productId}</td>
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
                        <td><Time value={entry.createdAt} /></td>
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
              <dd><Time value={order.createdAt} /></dd>
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
