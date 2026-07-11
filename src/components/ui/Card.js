// src/components/ui/Card.js
import React from 'react';
import { twMerge } from 'tailwind-merge';

/** Conteneur carte blanc standard. */
function Card({ className = '', children, ...props }) {
  return (
    <div
      className={twMerge('rounded-lg bg-white p-6 shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
