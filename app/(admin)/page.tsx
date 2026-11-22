import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type SummaryField = {
  key:
    | 'totalProducts'
    | 'activeProducts'
    | 'totalOrders'
    | 'pendingOrders'
    | 'confirmedOrders'
    | 'shippedOrders'
    | 'cancelledOrders'
    | 'totalInventoryUnits';
  label: string;
};

const SUMMARY_FIELDS: SummaryField[] = [
  { key: 'totalProducts', label: 'Total products' },
  { key: 'activeProducts', label: 'Active products' },
  { key: 'totalOrders', label: 'Total orders' },
  { key: 'pendingOrders', label: 'Pending orders' },
  { key: 'confirmedOrders', label: 'Confirmed orders' },
  { key: 'shippedOrders', label: 'Shipped orders' },
  { key: 'cancelledOrders', label: 'Cancelled orders' },
  { key: 'totalInventoryUnits', label: 'Inventory units' },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  // ponytail: hardcoded 127.0.0.1:3000 matches the documented dev server in
  // the README ("Open http://localhost:3000"); the e2e harness runs on 3000
  // and the perf-budget harness on 3300. Switch to a host/port env var
  // (NEXT_PUBLIC_API_ORIGIN) when a separate frontend/backend split lands.
  const res = await fetch('http://127.0.0.1:3000/api/dashboard/summary', {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });

  if (!res.ok) {
    redirect('/login');
  }

  const body = (await res.json()) as {
    success: boolean;
    data: Record<SummaryField['key'], number>;
  };

  if (!body.success) {
    redirect('/login');
  }

  return (
    <div className="summary-grid">
      {SUMMARY_FIELDS.map((field) => (
        <div key={field.key} className="card summary-card">
          <span className="label">{field.label}</span>
          <span className="value">{body.data[field.key]}</span>
        </div>
      ))}
      <Link href="/products" className="btn btn-primary">
        Manage products
      </Link>
    </div>
  );
}
