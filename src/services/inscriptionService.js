// src/services/inscriptionService.js
//
// « Fenêtre d'inscription » : interrupteur qui autorise (ou non) la réclamation
// des comptes médecin à la première connexion (« premier code = le sien »).
//
// - Ouverte : un médecin dont le compte est encore « à réclamer » peut définir
//   son code à 6 chiffres à sa première connexion.
// - Fermée : plus aucune réclamation possible via l'application (garde-fou pour
//   borner la période où un compte non réclamé pourrait être pris par un tiers).
//
// Le document est en LECTURE PUBLIQUE (la page de login doit connaître l'état
// avant toute authentification) et en écriture admin uniquement.
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import logger from '../utils/logger';

const CONFIG_COLLECTION = 'config';
const INSCRIPTION_DOC = 'inscription';

export const getInscriptionOuverte = async () => {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, INSCRIPTION_DOC));
    return snap.exists() ? snap.data().open === true : false;
  } catch (error) {
    // Best-effort : en cas d'échec de lecture, on considère les inscriptions
    // fermées (côté sûr : pas de réclamation par défaut).
    logger.error('Erreur lors de la lecture de l\'état des inscriptions:', error);
    return false;
  }
};

export const setInscriptionOuverte = async (open) => {
  try {
    await setDoc(doc(db, CONFIG_COLLECTION, INSCRIPTION_DOC), { open: open === true });
    logger.debug('État des inscriptions mis à jour', { open: open === true });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'état des inscriptions:', error);
    throw error;
  }
};
