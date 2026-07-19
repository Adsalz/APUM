// src/components/ui/Select.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

/**
 * <select> natif habillé (flèche personnalisée, focus cohérent).
 * Tous les props supplémentaires sont transmis au <select>.
 * forwardRef : la ref pointe sur le <select> natif (focus programmatique).
 */
const Select = React.forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={twMerge(
          'w-full appearance-none rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-9 text-sm text-ink-800 shadow-sm',
          'transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25',
          'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
});

export default Select;
