import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/current-user';
import { LogoutButton } from './logout-button';
import { ActiveNav } from './active-nav';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">StockFlow</div>
        <ActiveNav />
        <div className="sidebar-footer">
          <div>Signed in as {user.email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
