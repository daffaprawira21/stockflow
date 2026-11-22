'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

export type NavItem = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav>
      {items.map((item) => {
        const active = item.matches(pathname);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={active ? 'active' : ''}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
