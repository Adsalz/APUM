import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import logger from '../utils/logger';

const USERS_COLLECTION = 'users';
const ANNUAIRE_COLLECTION = 'annuaire';

export const createUser = async (uid, userData) => {
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), userData);
    logger.debug('Utilisateur créé avec succès');
  } catch (error) {
    logger.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
};

export const getUser = async (uid) => {
  try {
    if (!uid) {
      logger.warn('UID non fourni');
      return null;
    }

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      logger.debug('Profil chargé', { uid });
      return { id: userDoc.id, ...userData };
    } else {
      logger.warn('Aucun utilisateur trouvé avec cet UID');
      return null;
    }
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw error;
  }
};

export const updateUser = async (uid, userData) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), userData);
    logger.debug('Utilisateur mis à jour avec succès');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    throw error;
  }
};

// Suppression d'un utilisateur.
//
// On supprime EN UN SEUL BATCH le document `users/{uid}` ET son entrée
// `annuaire/{uid}` :
//  - la suppression de `users/{uid}` révoque IMMÉDIATEMENT tout accès (plus
//    aucun rôle valide → toutes les opérations sont refusées) ;
//  - la suppression de `annuaire/{uid}` retire le médecin de la liste
//    déroulante de connexion (sinon il resterait sélectionnable publiquement
//    et son email resterait résolvable). Un delete sur un doc annuaire
//    inexistant est un no-op inoffensif.
//
// Le compte de connexion Firebase Auth (email), lui, n'est PAS supprimable
// depuis l'app : seule une opération serveur (SDK Admin) le permet, ce qui
// exige le plan Blaze (Cloud Functions) ou un script Admin local. Sa
// suppression définitive (réutilisation de l'email / effacement RGPD) se fait
// dans la console Firebase → Authentication, ou via scripts/supprimer-compte-auth.js.
export const deleteUser = async (uid) => {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, USERS_COLLECTION, uid));
    batch.delete(doc(db, ANNUAIRE_COLLECTION, uid));
    await batch.commit();
    logger.debug('Document utilisateur + entrée annuaire supprimés — accès révoqué');
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const currentUserDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'admin') {
      throw new Error('Accès non autorisé');
    }

    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Erreur lors de la récupération de tous les utilisateurs:', error);
    throw error;
  }
};

export const getMedecins = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const q = query(collection(db, USERS_COLLECTION), where('role', '==', 'medecin'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Erreur lors de la récupération des médecins:', error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    logger.error('Erreur lors de la recherche de l\'utilisateur par email:', error);
    throw error;
  }
};