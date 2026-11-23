import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { OrdersFilters } from './orders-filters';

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-pending',
  CONFIRMED: 'badge-confirmed',
  SHIPPED: 'badge-shipped',
  CANCELLED: 'badge-cancelled',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const status = params.status as string | undefined;
  const search = (params.search as string | undefined) ?? '';
  const sortBy = (params.sortBy as string | undefined) ?? 'createdAt';
  const sortOrder = (params.sortOrder as string | undefined) ?? 'desc';

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', '10');
  if (status) query.set('status', status);
  if (search) query.set('search', search);
  query.set('sortBy', sortBy);
  query.set('sortOrder', sortOrder);

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch(`http://127.0.0.1:3000/api/orders?${query.toString()}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: OrderSummary[];
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Orders</h1>
          <Link href="/orders/create" className="btn btn-primary">
            Create order
          </Link>
        </div>
      </div>

      <div className="card">
        <OrdersFilters
          search={search}
          status={status ?? ''}
          sortBy={sortBy}
          sortOrder={sortOrder}
          page={page}
        />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {body.data.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[order.status] ?? ''}`}>
                    {order.status}
                  </span>
                </td>
                <td>{formatMoney(order.totalAmount)}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>
                  <Link href={`/orders/${order.id}`} className="btn">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {body.meta.totalItems > 0 ? (
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem' }}>
            {body.meta.totalItems} order{body.meta.totalItems === 1 ? '' : 's'}
          </p>
        ) : (
          <p style={{ color: 'var(--color-ink-muted)' }}>No orders found.</p>
        )}
      </div>
    </div>
  );
}
