'use client';

import { useEffect, useRef, useState } from 'react';
import { MoonIcon, SunIcon } from '@/components/ui/Icons';
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

function getStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  // Hydrate from the attribute the no-flash script set on first paint; fall
  // back to the system default (dark-first, matching the committed world) so
  // there is no wrong-icon flash.
  const [theme, setTheme] = useState<Theme>(
    () =>
      (typeof document !== 'undefined' &&
        (document.documentElement.dataset.theme as Theme | undefined)) ||
      'dark',
  );
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // Track the OS setting, but only when the operator has no explicit choice
    // (an explicit choice is stored in localStorage).
    function onSystemChange() {
      if (getStoredTheme() === null) {
        const next = getSystemTheme();
        applyTheme(next);
        setTheme(next);
      }
    }
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); the toggle still works for the session.
    }
  }

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLight ? (
        <MoonIcon style={{ width: 14, height: 14 }} />
      ) : (
        <SunIcon style={{ width: 14, height: 14 }} />
      )}
    </button>
  );
}
