// src/components/ui/Button.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from './Spinner';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold ' +
  'transition-all duration-150 active:scale-[0.98] ' +
  'disabled:cursor-not-allowed disabled:active:scale-100 select-none whitespace-nowrap';

const variants = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow ' +
    'disabled:bg-primary-300 disabled:text-white/80 disabled:shadow-none',
  secondary:
    'bg-white text-ink-700 border border-ink-200 shadow-sm hover:bg-ink-50 hover:border-ink-300 ' +
    'disabled:text-ink-400 disabled:bg-ink-50',
  danger:
    'bg-danger-600 text-white shadow-sm hover:bg-danger-700 disabled:bg-danger-300',
  success:
    'bg-success-600 text-white shadow-sm hover:bg-success-700 disabled:bg-success-300',
  ghost:
    'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-400',
  'ghost-primary':
    'bg-transparent text-primary-700 hover:bg-primary-50 disabled:text-ink-400',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-[0.95rem]',
  icon: 'p-2',
};

/**
 * Bouton standard de l'application.
 *
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'|'ghost-primary'} variant
 * @param {'sm'|'md'|'lg'|'icon'} size
 * @param {boolean} loading  Affiche un spinner et désactive le bouton
 * @param {React.ReactNode} icon  Icône lucide-react optionnelle (avant le texte)
 */
function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon = null,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={twMerge(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

export default Button;
