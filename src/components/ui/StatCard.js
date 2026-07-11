// src/components/ui/StatCard.js
import React from 'react';
import Card from './Card';
import { twMerge } from 'tailwind-merge';

const tones = {
  blue: 'bg-primary-50 text-primary-600',
  green: 'bg-success-50 text-success-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-danger-50 text-danger-600',
};

/** Carte de statistique (icône + libellé + valeur). */
function StatCard({ icon, label, tone = 'blue', children, className = '' }) {
  return (
    <Card className={twMerge('transition-shadow hover:shadow-elevated', className)}>
      <div className="mb-3 flex items-center gap-3">
        <div
          className={twMerge('flex h-11 w-11 items-center justify-center rounded-xl', tones[tone] || tones.blue)}
          aria-hidden="true"
        >
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{label}</h2>
      </div>
      {children}
    </Card>
  );
}

export default StatCard;
