import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { SpinnerIcon } from './Icons';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  pending?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'secondary', pending, children, className, ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : variant === 'ghost' ? 'btn-ghost' : '';
  return (
    <button
      className={`btn ${variantClass} ${className ?? ''}`}
      disabled={pending || props.disabled}
      {...props}
    >
      {pending ? <SpinnerIcon className="animate-spin" style={{ width: 14, height: 14 }} /> : null}
      {children}
    </button>
  );
}
