// src/services/nouveauTourService.js
//
// Lancement d'un nouveau tour de choix depuis l'application.
//
// Effacer le code des autres médecins est impossible depuis un navigateur (le
// SDK client ne change que le mot de passe de l'utilisateur connecté) : le
// travail est fait par la Cloud Function `lancerNouveauTour` (functions/index.js),
// qui vérifie elle-même le rôle administrateur de l'appelant.
//
// Équivalent hors application : scripts/nouveaux-choix.js.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import logger from '../utils/logger';

// Doit correspondre à la région déclarée dans functions/index.js.
const REGION = 'europe-west1';

// Le tour touche tous les médecins un par un : large, mais borné par le délai
// de la fonction elle-même (300 s).
const DELAI_MS = 300000;

/**
 * Efface le code de tous les médecins et ouvre la fenêtre d'inscription.
 * @returns {Promise<{total:number, ok:number, echecs:Array<{email:string,message:string}>}>}
 */
export const lancerNouveauTour = async () => {
  try {
    const fn = httpsCallable(getFunctions(app, REGION), 'lancerNouveauTour', { timeout: DELAI_MS });
    const { data } = await fn();
    logger.debug('Nouveau tour de choix lancé', data);
    return data;
  } catch (error) {
    logger.error('Erreur lors du lancement du nouveau tour:', error);
    throw error;
  }
};
