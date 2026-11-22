import Link from 'next/link';

export type NavLink = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
};

const NAV_ITEMS: NavLink[] = [
  { href: '/', label: 'Dashboard', matches: (p) => p === '/' },
  {
    href: '/products',
    label: 'Products',
    matches: (p) => p.startsWith('/products'),
  },
  {
    href: '/inventory',
    label: 'Inventory',
    matches: (p) => p.startsWith('/inventory'),
  },
  {
    href: '/orders',
    label: 'Orders',
    matches: (p) => p.startsWith('/orders'),
  },
];

function SingleNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href as never} className={active ? 'active' : ''}>
      {label}
    </Link>
  );
}

export function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav>
      {NAV_ITEMS.map((item) => (
        <SingleNavLink
          key={item.href}
          href={item.href}
          label={item.label}
          active={item.matches(pathname)}
        />
      ))}
    </nav>
  );
}
