'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LogoutButton } from './logout-button';
import { ActiveNav } from './active-nav';
import { Logo } from '@/components/ui/Logo';

type MobileShellProps = {
  userEmail: string;
  children: ReactNode;
};

export function MobileShell({ userEmail, children }: MobileShellProps) {
  const [open, setOpen] = useState(false);

  // Close the off-canvas drawer when the viewport grows past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    function onResize() {
      if (mq.matches) setOpen(false);
    }
    mq.addEventListener('change', onResize);
    return () => mq.removeEventListener('change', onResize);
  }, []);

  // Close on Escape for keyboard users.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the drawer when a nav link is chosen (mobile; harmless on desktop).
  useEffect(() => {
    function onRoute() {
      setOpen(false);
    }
    window.addEventListener('popstate', onRoute);
    return () => window.removeEventListener('popstate', onRoute);
  }, []);

  return (
    <>
      {/* Mobile top bar with hamburger — visible under 900px only */}
      <div className="mobile-bar">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ width: 20, height: 20 }}
            aria-hidden
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="mobile-bar-brand">
          <Logo style={{ width: 28, height: 28 }} />
          <span>StockFlow</span>
        </div>
      </div>

      <div className="shell">
        <div
          className={`sidebar-backdrop${open ? ' visible' : ''}`}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigation">
          {/* Desktop brand header (hidden on mobile; top bar carries it there) */}
          <Link href="/" className="sidebar-brand">
            <Logo className="sidebar-brand-mark" style={{ width: 32, height: 32 }} />
            <span>StockFlow</span>
          </Link>
          <ActiveNav />
          <div className="sidebar-footer">
            <div>Signed in as {userEmail}</div>
            <LogoutButton />
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
