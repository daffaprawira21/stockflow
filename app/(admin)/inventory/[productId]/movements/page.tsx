import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { MovementsFilters } from './movements-filters';

type Movement = {
  id: string;
  movementType: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  orderId: string | null;
  reason: string | null;
  createdAt: string;
};

export default async function StockMovementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const { productId } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const movementType = sp.movementType as string | undefined;

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', '10');
  if (movementType) query.set('movementType', movementType);

  // Same-origin loopback fetch: in Next 16 the `fetch` inside a server
  // component does not forward cookies, so the session cookie is attached
  // explicitly. Absolute localhost URL keeps the request on the same host
  // regardless of the port the dev server runs on.
  const res = await fetch(
    `http://127.0.0.1:3000/api/inventory/${productId}/movements?${query.toString()}`,
    {
      cache: 'no-store',
      headers: { cookie: cookieStore.toString() },
    },
  );

  if (res.status === 404) {
    notFound();
  }

  // 400/422 are query-param validation errors (bad movementType, page, lowStock);
  // show an empty table rather than a misleading 404 page.
  if (res.status === 400 || res.status === 422) {
    return (
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Stock movements</h1>
            <Link href="/inventory" className="btn">
              Back to inventory
            </Link>
          </div>
        </div>
        <div className="card">
          <p style={{ color: 'var(--color-ink-muted)' }}>
            The filter query is invalid. Clear the movement-type filter and try again.
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
    data: Movement[];
    meta: { page: number; limit: number; totalItems: number; totalPages: number };
  };

  if (!body.success) {
    notFound();
  }

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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Stock movements</h1>
          <Link href="/inventory" className="btn">
            Back to inventory
          </Link>
        </div>
      </div>

      <div className="card">
        <MovementsFilters movementType={movementType ?? ''} page={page} />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Delta</th>
              <th>Before</th>
              <th>After</th>
              <th>Reason</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {body.data.map((movement) => (
              <tr key={movement.id}>
                <td>{formatDate(movement.createdAt)}</td>
                <td>{movement.movementType}</td>
                <td style={{ color: movement.quantityDelta > 0 ? 'var(--color-status-shipped)' : 'var(--color-danger)' }}>
                  {movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : movement.quantityDelta}
                </td>
                <td>{movement.quantityBefore}</td>
                <td>{movement.quantityAfter}</td>
                <td>{movement.reason ?? '—'}</td>
                <td>{movement.orderId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {body.meta.totalItems > 0 ? (
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem' }}>
            {body.meta.totalItems} movement{body.meta.totalItems === 1 ? '' : 's'}
          </p>
        ) : (
          <p style={{ color: 'var(--color-ink-muted)' }}>No stock movements found.</p>
        )}
      </div>
    </div>
  );
}
