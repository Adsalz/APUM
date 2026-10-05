// src/components/ui/Checkbox.js
import React, { useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Check } from 'lucide-react';

let cbCounter = 0;

/**
 * Case à cocher accessible avec label cliquable.
 *
 * @param {boolean} checked
 * @param {(checked:boolean)=>void} onChange
 * @param {string} label
 * @param {boolean} [disabled] coche figée (lecture seule)
 */
function Checkbox({ checked, onChange, label, description, className = '', id: providedId, disabled = false }) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    cbCounter += 1;
    idRef.current = providedId || `cb-${cbCounter}`;
  }
  const id = providedId || idRef.current;

  return (
    <label
      htmlFor={id}
      className={twMerge(
        'group flex items-start gap-3 rounded-lg p-1 -m-1',
        disabled ? 'cursor-default' : 'cursor-pointer',
        className
      )}
    >
      <span className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={twMerge(
            'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
            'border-ink-300 bg-white',
            !disabled && 'group-hover:border-primary-400',
            'peer-checked:border-primary-600 peer-checked:bg-primary-600',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30'
          )}
        >
          <Check
            size={13}
            strokeWidth={3}
            className={twMerge(
              'text-white transition-opacity',
              checked ? 'opacity-100' : 'opacity-0'
            )}
          />
        </span>
      </span>
      <span className="text-sm">
        <span className="font-medium text-ink-700">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

export default Checkbox;
