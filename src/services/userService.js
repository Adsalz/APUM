import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export const createUser = async (uid, userData) => {
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), userData);
    console.log('Utilisateur créé avec succès');
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
};

export const getUser = async (uid) => {
  try {
    if (!uid) {
      console.log('UID non fourni');
      return null;
    }

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('Utilisateur trouvé:', userData);
      return { id: userDoc.id, ...userData };
    } else {
      console.log('Aucun utilisateur trouvé avec cet UID');
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw error;
  }
};

export const updateUser = async (uid, userData) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), userData);
    console.log('Utilisateur mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    throw error;
  }
};

export const deleteUser = async (uid) => {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
    console.log('Utilisateur supprimé avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
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
    console.error('Erreur lors de la récupération de tous les utilisateurs:', error);
    throw error;
  }
};

export const getMedecins = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const q = query(collection(db, USERS_COLLECTION), where("role", "==", "medecin"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erreur lors de la récupération des médecins:', error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
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
    console.error('Erreur lors de la recherche de l\'utilisateur par email:', error);
    throw error;
  }
};