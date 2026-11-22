'use client';

import { usePathname } from 'next/navigation';
import { NavLinks } from './nav-links';

export function ActiveNav() {
  const pathname = usePathname();

  return <NavLinks pathname={pathname} />;
}
