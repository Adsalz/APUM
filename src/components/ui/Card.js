// src/components/ui/Card.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

/** Conteneur carte blanc standard (bord fin + ombre douce). */
function Card({ className = '', children, ...props }) {
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-ink-100 bg-white p-6 shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
