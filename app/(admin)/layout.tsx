import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/current-user';
import { MobileShell } from './mobile-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <MobileShell userEmail={user.email}>{children}</MobileShell>;
}
