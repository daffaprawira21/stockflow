import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      {...props}
    >
      {/* Outer rounded square */}
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--color-primary)" />
      {/* Inner ring */}
      <rect x="8" y="8" width="16" height="16" rx="3.5" fill="var(--color-bg)" />
      {/* Flow arrow — upward right, two strokes */}
      <path
        d="M12.5 20.5 L20.5 12.5"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 12.5 H20.5 V16.5"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
