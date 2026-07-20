import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { getUser } from './userService';
import { CODE_A_RECLAMER } from '../constants/claim';
import logger from '../utils/logger';

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

// Crée un compte médecin « à réclamer » : son mot de passe initial est le code
// de réclamation partagé (CODE_A_RECLAMER). Aucun email n'est envoyé — le
// médecin choisira son code à 6 chiffres à sa première connexion via
// loginMedecin (« premier code = le sien »).
export const registerUser = async (email) => {
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.REACT_APP_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: CODE_A_RECLAMER,
        returnSecureToken: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Propager la vraie cause Firebase (avec un `.code` auth/*) au handler UI
      throw mapFirebaseSignUpError(data);
    }

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

// Connexion classique par email + mot de passe (espace administrateur).
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

// Connexion médecin par code à 6 chiffres, avec réclamation « premier code = le sien ».
//
//  1. On tente le code saisi comme mot de passe : si ça marche, le compte est
//     déjà réclamé et le code est correct → connexion.
//  2. Sinon, et SEULEMENT si les inscriptions sont ouvertes, on tente de se
//     connecter avec le code de réclamation partagé :
//       - succès → le compte était « à réclamer » : on adopte le code choisi
//         (updatePassword) → le compte est désormais réclamé avec ce code ;
//       - échec → le compte est déjà réclamé (le code saisi est simplement
//         incorrect) : on propage l'erreur initiale.
//  3. Si les inscriptions sont fermées, on ne tente pas la réclamation :
//     échec = code incorrect.
export const loginMedecin = async (email, code, inscriptionsOuvertes) => {
  try {
    return await signInWithEmailAndPassword(auth, email, code);
  } catch (error) {
    // On ne tente la réclamation que si les inscriptions sont ouvertes ET que
    // l'échec est bien un problème d'identifiant (pas un throttling ni une
    // erreur réseau) : évite de brûler une 2ᵉ tentative de sign-in inutile
    // (et donc d'accélérer le verrou auth/too-many-requests).
    const isCredentialError =
      error && (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential');
    if (!inscriptionsOuvertes || !isCredentialError) {
      throw error;
    }
    let claimCredential;
    try {
      claimCredential = await signInWithEmailAndPassword(auth, email, CODE_A_RECLAMER);
    } catch (claimError) {
      // Compte déjà réclamé (ou autre) : le code saisi est simplement incorrect.
      throw error;
    }
    // Compte « à réclamer » : on fixe le code choisi par le médecin. Si
    // updatePassword échoue, on déconnecte pour ne pas laisser une session
    // « à moitié réclamée » (connecté mais code encore au code de réclamation).
    try {
      await updatePassword(claimCredential.user, code);
    } catch (updateError) {
      await signOut(auth).catch((e) => logger.error('signOut après échec de réclamation:', e));
      throw updateError;
    }
    logger.debug('Compte réclamé — premier code défini');
    return claimCredential;
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
