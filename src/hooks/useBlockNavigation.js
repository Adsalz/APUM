// src/hooks/useBlockNavigation.js
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Bloque la navigation interne (React Router, data router) tant que `when` est
 * vrai et demande confirmation avant de quitter. Remplace le <Prompt> de
 * react-router v5. Complète `useUnsavedChangesWarning` qui, lui, couvre la
 * fermeture/le rechargement de l'onglet.
 *
 * @param {boolean} when     true tant qu'il y a des modifications non sauvegardées
 * @param {string}  message  texte de la confirmation
 */
export default function useBlockNavigation(when, message) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);
}
