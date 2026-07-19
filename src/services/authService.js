import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { getUser } from './userService';
import logger from '../utils/logger';

// Génère un mot de passe temporaire robuste (>= 12 caractères) via
// crypto.getRandomValues, avec au moins une minuscule, une majuscule et un
// chiffre pour respecter les règles de complexité de Firebase Auth.
// Exporté aussi pour proposer aux médecins un « code fort » généré.
export const generateTempPassword = (length = 16) => {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;

  const randomValues = new Uint32Array(length * 2);
  window.crypto.getRandomValues(randomValues);

  const pick = (charset, value) => charset[value % charset.length];

  // Garantir la présence de chaque classe de caractères exigée par Firebase
  const chars = [
    pick(lower, randomValues[0]),
    pick(upper, randomValues[1]),
    pick(digits, randomValues[2])
  ];
  for (let i = 3; i < length; i++) {
    chars.push(pick(all, randomValues[i]));
  }

  // Mélange de Fisher-Yates pour masquer la position des caractères garantis
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomValues[length + i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

// Traduit les erreurs de l'API REST Firebase Identity Toolkit en Error dont le
// `.code` suit la convention `auth/*` attendue par les handlers UI.
const mapFirebaseSignUpError = (data) => {
  const message = (data && data.error && data.error.message) || '';

  if (message.startsWith('EMAIL_EXISTS')) {
    const error = new Error('Cette adresse email est déjà utilisée.');
    error.code = 'auth/email-already-in-use';
    return error;
  }
  if (message.startsWith('INVALID_EMAIL')) {
    const error = new Error('Adresse email invalide.');
    error.code = 'auth/invalid-email';
    return error;
  }
  if (message.startsWith('WEAK_PASSWORD')) {
    const error = new Error('Le mot de passe est trop faible.');
    error.code = 'auth/weak-password';
    return error;
  }

  const error = new Error('Erreur lors de la création de l\'utilisateur');
  error.code = 'auth/internal-error';
  return error;
};

export const registerUser = async (email) => {
  try {
    // Générer un mot de passe temporaire robuste (l'utilisateur le réinitialise
    // ensuite via l'email de réinitialisation ci-dessous).
    const tempPassword = generateTempPassword();

    // Utiliser l'API REST Firebase pour créer l'utilisateur
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.REACT_APP_FIREBASE_API_KEY}`, {
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

    const data = await response.json();

    if (!response.ok) {
      // Propager la vraie cause Firebase (avec un `.code` auth/*) au handler UI
      throw mapFirebaseSignUpError(data);
    }

    // Envoyer l'email de réinitialisation de mot de passe
    await sendPasswordResetEmail(auth, email);

    return {
      user: {
        uid: data.localId,
        email: data.email
      }
    };
  } catch (error) {
    logger.error('Erreur lors de l\'enregistrement:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    logger.debug('Utilisateur connecté:', userCredential.user.uid);
    const userDetails = await getUser(userCredential.user.uid);
    return { ...userCredential, role: userDetails.role };
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    logger.debug('Utilisateur déconnecté');
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
};

export const updateUserPassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword);
      logger.debug('Mot de passe mis à jour avec succès');
    } else {
      throw new Error('Aucun utilisateur connecté');
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du mot de passe:', error);
    throw error;
  }
};

// Change le code (mot de passe) de l'utilisateur connecté APRÈS avoir vérifié
// son code actuel via une réauthentification.
//
// Deux raisons :
//  1) Sécurité : sans réauth, une session détournée (appareil laissé connecté,
//     token volé) permettrait de changer le code sans connaître l'ancien, donc
//     de verrouiller le propriétaire hors de son compte.
//  2) Fiabilité : updatePassword seul échoue avec `auth/requires-recent-login`
//     dès que la session n'est plus récente ; la réauthentification lève ce cas.
//
// Propage l'erreur Firebase (`.code` auth/*) pour que l'UI distingue un code
// actuel erroné (`auth/wrong-password`) des autres échecs.
export const reauthenticateAndUpdatePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Aucun utilisateur connecté');
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    logger.debug('Code mis à jour avec succès (après réauthentification)');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du code:', error);
    throw error;
  }
};