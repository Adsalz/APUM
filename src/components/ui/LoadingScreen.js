// src/components/ui/LoadingScreen.js
import React from 'react';
import { CalendarDays } from 'lucide-react';

/** Écran de chargement plein écran. */
function LoadingScreen({ message = 'Chargement…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink-100">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
        <CalendarDays className="h-6 w-6 text-primary-600" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-ink-500">{message}</p>
    </div>
  );
}

export default LoadingScreen;
