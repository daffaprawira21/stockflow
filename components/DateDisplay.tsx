'use client';

import { useEffect, useState } from 'react';

// SSR-safe locale date formatting (see commit c70c1b2). Server and the first
// client paint render the raw ISO string to avoid a hydration mismatch; the
// localized value is filled in on a deferred (non-synchronous) effect tick so
// the react-hooks/set-state-in-effect rule stays happy.
export function DateDisplay({ value }: { value: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    // Deferred so no setState runs synchronously in the effect body.
    const id = window.setTimeout(() => {
      setFormatted(new Date(value).toLocaleString());
    }, 0);
    return () => window.clearTimeout(id);
  }, [value]);

  if (formatted === null) {
    return <span>{value}</span>;
  }

  return <span>{formatted}</span>;
}
