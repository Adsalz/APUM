// src/components/ui/Badge.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

const tones = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
};

/** Étiquette / pastille de statut compacte. */
function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone] || tones.neutral,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export default Badge;
