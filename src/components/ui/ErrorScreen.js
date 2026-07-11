// src/components/ui/ErrorScreen.js
import React from 'react';
import { useHistory } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

/**
 * Écran d'erreur plein écran avec actions de récupération
 * (réessayer / retour) — remplace les 5 variantes copiées-collées.
 */
function ErrorScreen({ title = 'Une erreur est survenue', message, onRetry }) {
  const history = useHistory();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-100">
          <AlertCircle className="h-6 w-6 text-danger-600" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{title}</h1>
        {message && <p className="mb-6 text-sm text-gray-600">{message}</p>}
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => history.goBack()}>
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
