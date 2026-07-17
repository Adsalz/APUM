// src/components/ui/ActionCard.js
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Déclinaisons de couleur de la pastille d'icône
const tones = {
  blue: 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
  green: 'bg-success-50 text-success-600 group-hover:bg-success-100',
  purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
  orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
  red: 'bg-danger-50 text-danger-600 group-hover:bg-danger-100',
  gray: 'bg-ink-100 text-ink-600 group-hover:bg-ink-200',
};

/**
 * Tuile d'action de tableau de bord (pastille d'icône + titre + description).
 */
function ActionCard({ icon, title, description, tone = 'blue', onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        'group flex w-full items-center gap-4 rounded-xl border border-ink-100 bg-white p-4 text-left shadow-sm',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-elevated',
        className
      )}
    >
      <span
        className={twMerge(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
          tones[tone] || tones.blue
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink-900">{title}</span>
        <span className="block truncate text-sm text-ink-500">{description}</span>
      </span>
      <ChevronRight
        size={20}
        aria-hidden="true"
        className="flex-shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink-500"
      />
    </button>
  );
}

export default ActionCard;
