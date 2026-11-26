import Link from 'next/link';
import { OrdersFilters } from './orders-filters';
import { DateDisplay } from '@/components/DateDisplay';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/Icons';
import { requireAdmin, parseSearchQuery } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { orderListQuerySchema } from '@/modules/orders/schemas';
import { listOrders } from '@/modules/orders/service';

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
  await requireAdmin();
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const status = params.status as string | undefined;
  const search = (params.search as string | undefined) ?? '';
  const sortBy = (params.sortBy as string | undefined) ?? 'createdAt';
  const sortOrder = (params.sortOrder as string | undefined) ?? 'desc';

  // The domain module owns the query shape; an invalid query renders the
  // "clear the filters" state rather than a login redirect.
  const parsed = parseSearchQuery(params, orderListQuerySchema);
  if (!parsed.ok) {
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

  const { data: orders, meta } = await listOrders(prisma, parsed.query);

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
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
        />

        {orders.length === 0 ? (
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
                {orders.map((order) => {
                  const meta2 = STATUS_META[order.status] ?? {
                    status: 'inactive' as BadgeStatus,
                    label: order.status,
                  };
                  return (
                    <tr key={order.id}>
                      <td className="tabular-nums">{order.orderNumber}</td>
                      <td>
                        <Badge status={meta2.status}>{meta2.label}</Badge>
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
