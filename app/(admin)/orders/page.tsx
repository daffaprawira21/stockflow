import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { OrdersFilters } from './orders-filters';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/Icons';

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

const STATUS_META: Record<string, { status: BadgeStatus; label: string }> = {
  PENDING: { status: 'pending', label: 'Pending' },
  CONFIRMED: { status: 'confirmed', label: 'Confirmed' },
  SHIPPED: { status: 'shipped', label: 'Shipped' },
  CANCELLED: { status: 'cancelled', label: 'Cancelled' },
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

  // 400/422 are query-param validation errors (bad sortBy/status, etc.);
  // show an empty table rather than redirecting to login.
  if (res.status === 400 || res.status === 422) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Orders</h1>
          <Link href="/orders/create" className="btn btn-primary">
            <PlusIcon style={{ width: 14, height: 14 }} />
            Create order
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <Link href="/orders/create" className="btn btn-primary">
          <PlusIcon style={{ width: 14, height: 14 }} />
          Create order
        </Link>
      </div>

      <div className="card card-flat">
        <OrdersFilters
          search={search}
          status={status ?? ''}
          sortBy={sortBy}
          sortOrder={sortOrder}
          page={page}
          totalPages={body.meta.totalPages}
          totalItems={body.meta.totalItems}
        />

        {body.data.length === 0 ? (
          <EmptyState
            title="No orders found."
            subtitle={
              search
                ? `Nothing matches “${search}”. Try a different search.`
                : 'Create your first order to get started.'
            }
            action={
              <Link href="/orders/create" className="btn btn-primary">
                Create order
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Customer orders with status, total, and creation date</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total</th>
                  <th scope="col">Created</th>
                  <th scope="col" style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {body.data.map((order) => {
                  const meta = STATUS_META[order.status] ?? {
                    status: 'inactive' as BadgeStatus,
                    label: order.status,
                  };
                  return (
                    <tr key={order.id}>
                      <td className="tabular-nums">{order.orderNumber}</td>
                      <td>
                        <Badge status={meta.status}>{meta.label}</Badge>
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {formatMoney(order.totalAmount)}
                      </td>
                      <td><DateDisplay value={order.createdAt} /></td>
                      <td>
                        <Link href={`/orders/${order.id}`} className="btn btn-compact">
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
