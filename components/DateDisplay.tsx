'use client';

export function DateDisplay({ value }: { value: string }) {
  return <span>{new Date(value).toLocaleString()}</span>;
}
