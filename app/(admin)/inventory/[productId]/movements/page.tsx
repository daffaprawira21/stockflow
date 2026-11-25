import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { MovementsFilters } from './movements-filters';
import { DateDisplay } from '@/components/DateDisplay';
import { EmptyState } from '@/components/ui/EmptyState';
import { XIcon } from '@/components/ui/Icons';

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
        <div className="page-header">
          <h1 className="page-title">Stock movements</h1>
          <Link href="/inventory" className="btn btn-ghost">
            <XIcon style={{ width: 14, height: 14 }} />
            Back to inventory
          </Link>
        </div>
        <div className="card card-flat">
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock movements</h1>
        <Link href="/inventory" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to inventory
        </Link>
      </div>

      <div className="card card-flat">
        <MovementsFilters
          movementType={movementType ?? ''}
          page={page}
          totalPages={body.meta.totalPages}
          totalItems={body.meta.totalItems}
        />

        {body.data.length === 0 ? (
          <EmptyState
            title="No stock movements found."
            subtitle="Movements appear here as orders are confirmed, cancelled, or adjusted."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Stock movement ledger with date, type, and quantity changes</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Delta</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Before</th>
                  <th scope="col" style={{ textAlign: 'right' }}>After</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Order</th>
                </tr>
              </thead>
              <tbody>
                {body.data.map((movement) => {
                  const positive = movement.quantityDelta > 0;
                  return (
                    <tr key={movement.id}>
                      <td><DateDisplay value={movement.createdAt} /></td>
                      <td className="tabular-nums">{movement.movementType}</td>
                      <td
                        className="tabular-nums"
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: positive
                            ? 'var(--color-status-shipped)'
                            : 'var(--color-status-cancelled)',
                        }}
                      >
                        {positive ? `+${movement.quantityDelta}` : movement.quantityDelta}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {movement.quantityBefore}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {movement.quantityAfter}
                      </td>
                      <td>{movement.reason ?? '—'}</td>
                      <td className="tabular-nums">{movement.orderId ?? '—'}</td>
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
