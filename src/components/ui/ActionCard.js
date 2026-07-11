// src/components/ui/ActionCard.js
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Déclinaisons de couleur des tuiles d'action des tableaux de bord
const tones = {
  blue: 'border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-700',
  green: 'border-success-300 bg-success-50 hover:bg-success-100 text-success-700',
  purple: 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700',
  orange: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700',
  red: 'border-danger-300 bg-danger-50 hover:bg-danger-100 text-danger-700',
  gray: 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700',
};

/**
 * Tuile d'action de tableau de bord (icône + titre + description).
 * Remplace les blocs bouton de ~40 lignes recopiés sur les dashboards.
 */
function ActionCard({ icon, title, description, tone = 'blue', onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        'flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors',
        tones[tone] || tones.blue,
        className
      )}
    >
      <span className="flex items-center gap-4">
        <span aria-hidden="true">{icon}</span>
        <span>
          <span className="block font-medium text-gray-900">{title}</span>
          <span className="block text-sm text-gray-500">{description}</span>
        </span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  );
}

export default ActionCard;
