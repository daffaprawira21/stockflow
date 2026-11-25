'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOutIcon, SpinnerIcon } from '@/components/ui/Icons';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Always redirect to /login on sign-out, even if the API call fails
      // (e.g., session already expired). The server-side session is the
      // source of truth; the UI just reflects it.
      router.replace('/login');
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="btn btn-ghost"
      style={{ justifyContent: 'flex-start' }}
    >
      {pending ? (
        <SpinnerIcon style={{ width: 14, height: 14 }} className="animate-spin" />
      ) : (
        <LogOutIcon style={{ width: 14, height: 14 }} />
      )}
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
