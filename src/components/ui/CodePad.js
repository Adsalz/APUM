// src/components/ui/CodePad.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Delete } from 'lucide-react';

/**
 * Pavé numérique cliquable pour saisir un code de `length` chiffres.
 * Fonctionne à la souris/au doigt (boutons 0-9 + effacer) ET au clavier
 * physique (chiffres + Retour arrière quand le pavé a le focus). L'affichage
 * masque les chiffres saisis (points).
 *
 * @param {string} value      Code courant (chiffres uniquement)
 * @param {(next: string) => void} onChange
 * @param {number} length     Nombre de chiffres attendu (défaut 6)
 * @param {boolean} disabled
 * @param {string} ariaLabel  Nom accessible du groupe
 * @param {string} describedById  id d'un texte d'aide associé
 */
function CodePad({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  ariaLabel = 'Saisie du code',
  describedById,
}) {
  const append = (d) => {
    if (disabled || value.length >= length) return;
    onChange((value + d).slice(0, length));
  };
  const backspace = () => {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      append(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    }
  };

  const keyClass =
    'inline-flex h-14 items-center justify-center rounded-xl border border-ink-200 bg-white ' +
    'text-2xl font-semibold text-ink-800 shadow-sm transition-all ' +
    'hover:border-ink-300 hover:bg-ink-50 active:scale-95 ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 ' +
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

  const full = value.length >= length;

  return (
    // La saisie clavier (chiffres / Retour arrière) est captée quand une touche
    // du pavé a le focus : l'événement remonte jusqu'à ce onKeyDown. Le groupe
    // n'a donc pas besoin d'être focusable lui-même.
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={describedById}
      onKeyDown={handleKeyDown}
    >
      {/* Affichage masqué (points = chiffres saisis) */}
      <div className="mb-5 flex justify-center gap-3" aria-hidden="true">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={twMerge(
              'h-3.5 w-3.5 rounded-full border transition-colors',
              i < value.length ? 'border-primary-600 bg-primary-600' : 'border-ink-300'
            )}
          />
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        {value.length} sur {length} chiffres saisis
      </span>

      {/* Touches */}
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled || full}
            onClick={() => append(k)}
            className={keyClass}
          >
            {k}
          </button>
        ))}
        <span aria-hidden="true" />
        <button
          type="button"
          disabled={disabled || full}
          onClick={() => append('0')}
          className={keyClass}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={backspace}
          aria-label="Effacer le dernier chiffre"
          className={keyClass}
        >
          <Delete size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default CodePad;
