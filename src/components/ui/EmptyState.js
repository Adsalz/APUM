// src/components/ui/EmptyState.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * État vide illustré et calme (aucune donnée / aucun résultat).
 *
 * @param {React.ReactNode} icon    Icône lucide-react
 * @param {string} title            Titre
 * @param {string} description      Texte secondaire
 * @param {React.ReactNode} action  Bouton d'action optionnel
 */
function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-ink-800">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
