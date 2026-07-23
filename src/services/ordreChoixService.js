// src/services/ordreChoixService.js
// Persistance de l'ordre de choix courant (dernier validé), pour servir de base
// à la génération de la période suivante (règle de bascule N=10). Stocké comme un
// document unique dans la collection `planning` — écriture admin, lecture auth
// (mêmes règles que les autres documents `planning`).
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import logger from '../utils/logger';

const PLANNING_COLLECTION = 'planning';
const ORDRE_CHOIX_DOC = 'ordre_choix';

// Renvoie { premierTour, deuxiemeTour, updatedAt } ou null si aucun enregistré.
export const getOrdreChoix = async () => {
  try {
    const snap = await getDoc(doc(db, PLANNING_COLLECTION, ORDRE_CHOIX_DOC));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    logger.error('Erreur lors de la récupération de l’ordre de choix:', error);
    throw error;
  }
};

export const saveOrdreChoix = async ({ premierTour, deuxiemeTour }) => {
  try {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    await setDoc(doc(db, PLANNING_COLLECTION, ORDRE_CHOIX_DOC), {
      premierTour,
      deuxiemeTour,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde de l’ordre de choix:', error);
    throw error;
  }
};
