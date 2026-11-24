'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon, XIcon } from './Icons';

type SearchInputProps = {
  value: string;
  placeholder: string;
  /** Base path, e.g. "/products". Search param is "search". */
  basePath: string;
};

export function SearchInput({ value, placeholder, basePath }: SearchInputProps) {
  const router = useRouter();
  const [local, setLocal] = useState(value);

  // Keep in sync when the URL changes elsewhere (e.g. navigation).
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce 300ms.
  useEffect(() => {
    if (local === value) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (local === '') params.delete('search');
      else params.set('search', local);
      params.delete('page');
      const qs = params.toString();
      router.push((`${basePath}${qs ? `?${qs}` : ''}`) as never);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, router, basePath]);

  return (
    <div className="topbar-search" style={{ maxWidth: 'none' }}>
      <SearchIcon style={{ width: 14, height: 14 }} />
      <input
        type="search"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--color-ink)',
          fontSize: '0.8125rem',
          flex: 1,
          minWidth: 0,
        }}
        aria-label={placeholder}
      />
      {local !== '' ? (
        <button
          type="button"
          onClick={() => setLocal('')}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-ink-muted)',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
          }}
          aria-label="Clear search"
        >
          <XIcon style={{ width: 14, height: 14 }} />
        </button>
      ) : null}
    </div>
  );
}
