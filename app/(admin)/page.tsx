import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

type SummaryCard = {
  label: string;
  value: number;
  href: string;
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

  const summary = body.data;

  const cards: SummaryCard[] = [
    { label: 'Products', value: summary.totalProducts, href: '/products' },
    { label: 'Active products', value: summary.activeProducts, href: '/products?isActive=true' },
    { label: 'Inventory units', value: summary.totalInventoryUnits, href: '/inventory' },
    { label: 'Orders', value: summary.totalOrders, href: '/orders' },
    { label: 'Pending', value: summary.pendingOrders, href: '/orders?status=PENDING' },
    { label: 'Confirmed', value: summary.confirmedOrders, href: '/orders?status=CONFIRMED' },
    { label: 'Shipped', value: summary.shippedOrders, href: '/orders?status=SHIPPED' },
    { label: 'Cancelled', value: summary.cancelledOrders, href: '/orders?status=CANCELLED' },
  ];

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Dashboard</h1>
      </div>
      <div className="summary-grid">
        {cards.map((card) => (
          <Link
            key={card.label}
            // ponytail: query-string href not in static Route type; cast is safe.
            href={card.href as never}
            className="card summary-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="label">{card.label}</span>
            <span className="value">{card.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
