'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    await fetch('/api/auth/logout', { method: 'POST' });

    router.replace('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
