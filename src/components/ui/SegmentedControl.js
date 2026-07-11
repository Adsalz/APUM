// src/components/ui/SegmentedControl.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Contrôle segmenté (bascule entre plusieurs vues/modes).
 *
 * @param {Array<{value:string,label:string,icon?:React.ReactNode}>} options
 * @param {string} value            Valeur sélectionnée
 * @param {(v:string)=>void} onChange
 */
function SegmentedControl({ options, value, onChange, className = '', size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  return (
    <div
      role="tablist"
      className={twMerge(
        'inline-flex items-center gap-1 rounded-xl bg-ink-100 p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={twMerge(
              'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all',
              pad,
              active
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-ink-500 hover:text-ink-800'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
