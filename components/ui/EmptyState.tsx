import type { ReactNode } from 'react';
import { SearchIcon } from './Icons';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <SearchIcon />
      <div className="title">{title}</div>
      {subtitle ? <div className="subtitle">{subtitle}</div> : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
