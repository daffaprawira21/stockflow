import Link from 'next/link';
import { DashboardIcon, ProductsIcon, InventoryIcon, OrdersIcon } from '@/components/ui/Icons';
import type { ComponentType, SVGProps } from 'react';

type NavLink = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  matches: (pathname: string) => boolean;
};

const NAV_ITEMS: NavLink[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: DashboardIcon,
    matches: (p) => p === '/',
  },
  {
    href: '/products',
    label: 'Products',
    icon: ProductsIcon,
    matches: (p) => p.startsWith('/products'),
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: InventoryIcon,
    matches: (p) => p.startsWith('/inventory'),
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: OrdersIcon,
    matches: (p) => p.startsWith('/orders'),
  },
];

export function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.matches(pathname);
        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
