// src/components/ui/ErrorScreen.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

/**
 * Écran d'erreur plein écran avec actions de récupération
 * (réessayer / retour) — remplace les 5 variantes copiées-collées.
 */
function ErrorScreen({ title = 'Une erreur est survenue', message, onRetry }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 p-6">
      <Card className="w-full max-w-md text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50">
          <AlertCircle className="h-7 w-7 text-danger-500" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-lg font-bold text-ink-900">{title}</h1>
        {message && <p className="mb-6 text-sm text-ink-500">{message}</p>}
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Retour
          </Button>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ErrorScreen;
