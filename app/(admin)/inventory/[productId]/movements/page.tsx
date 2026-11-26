import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { MovementsFilters } from './movements-filters';
import { Time } from '@/components/Time';
import { EmptyState } from '@/components/ui/EmptyState';
import { XIcon } from '@/components/ui/Icons';
import { requireAdmin, parseSearchQuery } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { stockMovementProductIdSchema, stockMovementQuerySchema } from '@/modules/inventory/schemas';
import { listStockMovements } from '@/modules/inventory/service';
import { ApiError } from '@/lib/api/errors';

export default async function StockMovementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { productId } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const movementType = sp.movementType as string | undefined;

  // Validate the route param through the domain schema; a bad productId is a
  // 404 (the product doesn't exist), matching the pre-migration behaviour.
  const idParsed = stockMovementProductIdSchema.safeParse(productId);
  if (!idParsed.success) {
    notFound();
  }

  // A bad movement-type/page renders the "clear the filter" state rather than
  // a misleading 404, matching the pre-migration 400/422 handling.
  const parsed = parseSearchQuery(sp, stockMovementQuerySchema);
  if (!parsed.ok) {
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

  let movements;
  let meta;
  try {
    const result = await listStockMovements(prisma, idParsed.data, parsed.query);
    movements = result.data;
    meta = result.meta;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'RESOURCE_NOT_FOUND') {
      notFound();
    }
    redirect('/login');
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
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
        />

        {movements.length === 0 ? (
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
                {movements.map((movement) => {
                  const positive = movement.quantityDelta > 0;
                  return (
                    <tr key={movement.id}>
                      <td><Time value={movement.createdAt} /></td>
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
