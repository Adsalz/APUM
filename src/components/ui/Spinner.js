// src/components/ui/Spinner.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

/**
 * Indicateur de chargement circulaire.
 * @param {'sm'|'md'|'lg'} size
 */
function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={twMerge(
        'inline-block animate-spin rounded-full border-current border-t-transparent align-middle',
        sizes[size],
        className
      )}
    />
  );
}

export default Spinner;
