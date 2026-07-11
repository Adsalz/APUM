// src/components/ui/FormField.js
import React, { useRef } from 'react';
import { twMerge } from 'tailwind-merge';

// Générateur d'identifiants stables (React 17 : pas de useId)
let fieldCounter = 0;

/**
 * Champ de formulaire accessible : label associé (htmlFor/id), message
 * d'erreur relié via aria-describedby.
 *
 * Tous les autres props sont transmis à l'<input>.
 */
function FormField({ label, error = '', hint = '', className = '', id: providedId, ...inputProps }) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    fieldCounter += 1;
    idRef.current = providedId || `field-${fieldCounter}`;
  }
  const id = providedId || idRef.current;
  const errorId = `${id}-error`;

  return (
    <div className={twMerge('mb-4', className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={twMerge(
          'w-full rounded-md border px-3 py-2 text-sm text-gray-800 placeholder-gray-400',
          'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          error ? 'border-danger-400' : 'border-gray-300'
        )}
        {...inputProps}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
