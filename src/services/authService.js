import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getUser } from './userService';

export const registerUser = async (email) => {
  try {
    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8);

    // Utiliser l'API REST Firebase pour créer l'utilisateur
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDesXYDyPsrG5HxkkPbj9XuqFQV91j2ixY`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: tempPassword,
        returnSecureToken: true
      })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }

    const data = await response.json();

    // Envoyer l'email de réinitialisation de mot de passe
    await sendPasswordResetEmail(auth, email);

    return {
      user: {
        uid: data.localId,
        email: data.email
      }
    };
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