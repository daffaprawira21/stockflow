import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/current-user';
import { LogoutButton } from './logout-button';
import { NavLinks, type NavItem } from './nav-links';

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', matches: (pathname) => pathname === '/' },
  {
    href: '/products',
    label: 'Products',
    matches: (pathname) => pathname.startsWith('/products'),
  },
  {
    href: '/inventory',
    label: 'Inventory',
    matches: (pathname) => pathname.startsWith('/inventory'),
  },
  { href: '/orders', label: 'Orders', matches: (pathname) => pathname.startsWith('/orders') },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLinks items={NAV_ITEMS} />
        <div className="sidebar-footer">
          <div>Signed in as {user.email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
