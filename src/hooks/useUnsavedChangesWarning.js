// src/hooks/useUnsavedChangesWarning.js
import { useEffect } from 'react';

/**
 * Avertit l'utilisateur avant qu'il ne quitte/recharge l'onglet alors que des
 * modifications ne sont pas sauvegardées (rafraîchissement, fermeture, retour
 * navigateur). La navigation interne à l'app doit être gardée séparément.
 *
 * @param {boolean} when  true tant qu'il y a des changements non sauvegardés.
 */
export default function useUnsavedChangesWarning(when) {
  useEffect(() => {
    if (!when) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Requis par certains navigateurs pour déclencher la boîte de confirmation.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);
}
