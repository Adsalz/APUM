// src/components/ui/LoadingScreen.js
import React from 'react';
import Spinner from './Spinner';

/** Écran de chargement plein écran — remplace les « Chargement... » en texte brut. */
function LoadingScreen({ message = 'Chargement…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100">
      <Spinner size="lg" className="text-primary-600" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export default LoadingScreen;
