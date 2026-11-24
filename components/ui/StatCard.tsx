import Link from 'next/link';
import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: number | string;
  href?: string;
  icon?: ReactNode;
  delta?: string;
};

export function StatCard({ label, value, href, icon, delta }: StatCardProps) {
  const content = (
    <>
      {icon ? (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: 'var(--color-surface-2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-ink-muted)',
            marginBottom: 8,
          }}
        >
          {icon}
        </div>
      ) : null}
      <span className="label">{label}</span>
      <span className="value tabular-nums">{value}</span>
      {delta ? <span className="delta">{delta}</span> : null}
    </>
  );

  if (href) {
    // ponytail: query-string href not in static Route type; cast is safe.
    return (
      <Link href={href as never} className="card card-flat summary-card" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return <div className="card card-flat summary-card">{content}</div>;
}
