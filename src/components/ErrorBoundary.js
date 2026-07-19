// src/components/ErrorBoundary.js
import React from 'react';
import logger from '../utils/logger';

/**
 * Frontière d'erreur applicative : capture les exceptions de rendu de tout
 * l'arbre React et affiche un écran de repli plutôt qu'une page blanche.
 *
 * Autonome par conception : ne dépend d'aucun contexte (Router, Auth…) car
 * il enveloppe l'application entière, y compris ces fournisseurs.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logger.error('Erreur non gérée capturée par ErrorBoundary', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-pop">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50">
            <svg
              className="h-7 w-7 text-danger-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-bold text-ink-900">Une erreur est survenue</h1>
          <p className="mb-6 text-sm text-ink-600">
            L'application a rencontré un problème inattendu. Vous pouvez recharger la
            page ; si le problème persiste, contactez l'administrateur.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            Recharger l'application
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
