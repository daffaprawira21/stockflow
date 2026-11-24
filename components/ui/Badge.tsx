import type { ReactNode } from 'react';

export type BadgeStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'low';

const BADGE_CLASS: Record<BadgeStatus, string> = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  shipped: 'badge-shipped',
  cancelled: 'badge-cancelled',
  active: 'badge-active',
  inactive: 'badge-inactive',
  low: 'badge-low',
};

export function Badge({ status, children }: { status: BadgeStatus; children: ReactNode }) {
  return <span className={`badge ${BADGE_CLASS[status]}`}>{children}</span>;
}
