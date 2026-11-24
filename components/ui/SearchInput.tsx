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
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  // Show the URL value unless the user is mid-typing (debounce in flight).
  const shown = editing ? draft : value;

  // Debounce the in-flight keystroke into a URL push.
  useEffect(() => {
    if (!editing || draft === value) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (draft === '') params.delete('search');
      else params.set('search', draft);
      params.delete('page');
      const qs = params.toString();
      router.push((`${basePath}${qs ? `?${qs}` : ''}`) as never);
      setEditing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, value, editing, router, basePath]);

  return (
    <div className="topbar-search" style={{ maxWidth: 'none' }}>
      <SearchIcon style={{ width: 14, height: 14 }} />
      <input
        type="search"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          setEditing(true);
        }}
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
      {shown !== '' ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            setEditing(true);
          }}
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
