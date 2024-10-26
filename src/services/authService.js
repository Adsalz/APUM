import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword
} from 'firebase/auth';
import { getUser } from './userService';

export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Utilisateur enregistré:', userCredential);
    return userCredential;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Utilisateur connecté:', userCredential);
    const userDetails = await getUser(userCredential.user.uid);
    return { ...userCredential, role: userDetails.role };
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('Utilisateur déconnecté');
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
};

export const checkUserRole = async (uid, allowedRoles) => {
  try {
    const user = await getUser(uid);
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle:', error);
    return false;
  }
};

export const updateUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword);
      console.log('Mot de passe mis à jour avec succès');
    } else {
      throw new Error('Aucun utilisateur connecté');
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    throw error;
  }
};