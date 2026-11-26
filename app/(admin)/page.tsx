import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, type BadgeStatus } from '@/components/ui/Badge';
import {
  ProductsIcon,
  InventoryIcon,
  OrdersIcon,
  PackageIcon,
  PlusIcon,
  ArrowUpIcon,
} from '@/components/ui/Icons';

type SummaryValue = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  totalInventoryUnits: number;
};

const STATUS_META: Record<string, { status: BadgeStatus; label: string; href: string }> = {
  PENDING: { status: 'pending', label: 'Pending', href: '/orders?status=PENDING' },
  CONFIRMED: { status: 'confirmed', label: 'Confirmed', href: '/orders?status=CONFIRMED' },
  SHIPPED: { status: 'shipped', label: 'Shipped', href: '/orders?status=SHIPPED' },
  CANCELLED: { status: 'cancelled', label: 'Cancelled', href: '/orders?status=CANCELLED' },
};

export default async function DashboardPage() {
  const cookieStore = await cookies();

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch('http://127.0.0.1:3000/api/dashboard/summary', {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: SummaryValue;
  };

  if (!body.success) {
    redirect('/login');
  }

  const s = body.data;

  const pipeline = [
    { key: 'PENDING', value: s.pendingOrders },
    { key: 'CONFIRMED', value: s.confirmedOrders },
    { key: 'SHIPPED', value: s.shippedOrders },
    { key: 'CANCELLED', value: s.cancelledOrders },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/products/create" className="btn">
            <PlusIcon style={{ width: 14, height: 14 }} />
            Add product
          </Link>
          <Link href="/inventory/adjust" className="btn">
            <ArrowUpIcon style={{ width: 14, height: 14 }} />
            Adjust stock
          </Link>
          <Link href="/orders/create" className="btn btn-primary">
            <PlusIcon style={{ width: 14, height: 14 }} />
            Create order
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <StatCard
          label="Products"
          value={s.totalProducts}
          href="/products"
          icon={<ProductsIcon style={{ width: 16, height: 16 }} />}
        />
        <StatCard
          label="Active products"
          value={s.activeProducts}
          href="/products?isActive=true"
          icon={<PackageIcon style={{ width: 16, height: 16 }} />}
        />
        <StatCard
          label="Inventory units"
          value={s.totalInventoryUnits}
          href="/inventory"
          icon={<InventoryIcon style={{ width: 16, height: 16 }} />}
        />
        <StatCard
          label="Orders"
          value={s.totalOrders}
          href="/orders"
          icon={<OrdersIcon style={{ width: 16, height: 16 }} />}
        />
      </div>

      <div className="card card-flat" style={{ marginBottom: 24 }}>
        <h2 className="section-title">Order status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {pipeline.map(({ key, value }) => {
            const meta = STATUS_META[key];
            return (
              <Link
                key={key}
                href={meta.href as never}
                className="card card-flat"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 16,
                }}
              >
                <Badge status={meta.status}>{meta.label}</Badge>
                <span className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {value}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
