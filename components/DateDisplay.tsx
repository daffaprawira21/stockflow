'use client';

import { useEffect, useState } from 'react';

export function DateDisplay({ value }: { value: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(new Date(value).toLocaleString());
  }, [value]);

  if (formatted === null) {
    return <span>{value}</span>;
  }

  return <span>{formatted}</span>;
}
