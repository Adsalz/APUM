// src/components/ui/Button.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from './Spinner';

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300 disabled:text-primary-50',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-50',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-300',
  success:
    'bg-success-600 text-white hover:bg-success-700 disabled:bg-success-300',
  ghost:
    'bg-transparent text-primary-700 hover:bg-primary-50 disabled:text-gray-400',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

/**
 * Bouton standard de l'application.
 *
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
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
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

export default Button;
