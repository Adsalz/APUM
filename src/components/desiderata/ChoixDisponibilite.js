// src/components/desiderata/ChoixDisponibilite.js
// Choix d'une disponibilité (Oui / Possible / Non) pour une case de la grille.
//
// POURQUOI DES BOUTONS ET PAS UN <select> : signalement du 30/08/2026 — une
// utilisatrice ne voyait « que Oui et Possible » sur son téléphone. Le menu
// natif d'iOS est une roue qui n'affiche que quelques lignes autour de la
// valeur courante : avec « — » sélectionné, la roue montre « — / Oui /
// Possible » et il faut faire défiler pour atteindre « Non ». Rien ne
// l'indique, donc la 3ème option passe pour inexistante. Les trois choix sont
// désormais visibles en permanence, sans menu à ouvrir (et un tap au lieu de
// deux). Re-cliquer sur le choix actif efface la case.
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CHOIX_DISPONIBILITE } from '../../constants/creneaux';

// Habillage de chaque bouton, à l'état sélectionné et non sélectionné.
const styles = {
  Oui: {
    on: 'bg-success-500 text-white ring-success-600',
    off: 'bg-success-50 text-success-700 ring-success-200 hover:bg-success-100',
  },
  Possible: {
    on: 'bg-warning-500 text-white ring-warning-600',
    off: 'bg-warning-50 text-warning-700 ring-warning-200 hover:bg-warning-100',
  },
  Non: {
    on: 'bg-danger-500 text-white ring-danger-600',
    off: 'bg-danger-50 text-danger-700 ring-danger-200 hover:bg-danger-100',
  },
};

// Libellés courts pour les grilles étroites (la valeur envoyée reste entière).
const abrege = { Oui: 'Oui', Possible: 'Poss.', Non: 'Non' };

function ChoixDisponibilite({ value, onChange, label, compact = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-full items-stretch gap-1"
    >
      {CHOIX_DISPONIBILITE.map((choix) => {
        const actif = value === choix;
        return (
          <button
            key={choix}
            type="button"
            role="radio"
            aria-checked={actif}
            // Re-cliquer sur le choix actif remet la case à vide.
            onClick={() => onChange(actif ? '' : choix)}
            title={`${label} : ${choix}`}
            className={twMerge(
              'flex-1 rounded-lg py-1.5 text-center font-bold ring-1 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/40',
              compact ? 'px-0.5 text-[11px]' : 'px-1 text-xs',
              actif ? styles[choix].on : styles[choix].off
            )}
          >
            {compact ? abrege[choix] : choix}
          </button>
        );
      })}
    </div>
  );
}

export default ChoixDisponibilite;
