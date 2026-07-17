/**
 * Cloud Functions — Application APUM (projet Firebase `apum-8cfa4`).
 *
 * Ce module expose une fonction "callable" (appelable depuis le client) qui
 * réalise la SUPPRESSION COMPLÈTE d'un utilisateur :
 *   - suppression du compte Firebase Authentication ;
 *   - suppression du document Firestore `users/{uid}`.
 *
 * Contexte : côté client, `deleteUser` ne peut effacer que le document
 * Firestore. Le compte Auth, lui, survit (le SDK client ne peut supprimer
 * QUE le compte de l'utilisateur actuellement connecté). Cela laisse un
 * compte fantôme capable de se reconnecter → faille RGPD / contrôle d'accès.
 * Seul le SDK Admin (exécuté côté serveur) peut supprimer le compte Auth
 * d'un tiers ; d'où cette Cloud Function.
 *
 * Fonctions de 2e génération (v2), Node.js 20, région europe-west1
 * (résidence des données dans l'Union Européenne).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// --------------------------------------------------------------------------
// Initialisation unique du SDK Admin.
// (Évite les erreurs "app already exists" en cas de réutilisation d'instance.)
// --------------------------------------------------------------------------
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Toutes les fonctions de ce fichier sont déployées dans la région UE.
setGlobalOptions({ region: 'europe-west1' });

const USERS_COLLECTION = 'users';

/**
 * deleteUserAccount — Fonction callable de 2e génération.
 *
 * Données attendues (request.data) :
 *   { uid: string }  → l'identifiant de l'utilisateur à supprimer.
 *
 * Contrôles de sécurité :
 *   1. L'appelant doit être authentifié.
 *   2. L'appelant doit avoir le rôle `admin` (vérifié dans Firestore).
 *   3. `uid` doit être une chaîne non vide.
 *   4. Un admin ne peut pas se supprimer lui-même.
 *
 * Effets :
 *   - Supprime le compte Firebase Auth (tolère `auth/user-not-found`).
 *   - Supprime le document Firestore `users/{uid}`.
 *
 * Retour : { success: true }
 */
exports.deleteUserAccount = onCall(async (request) => {
  // 1. Authentification obligatoire.
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      "Vous devez être authentifié pour effectuer cette action."
    );
  }

  const callerUid = request.auth.uid;
  const db = admin.firestore();

  // 2. Vérification du rôle admin de l'appelant (source de vérité : Firestore).
  const callerSnap = await db.collection(USERS_COLLECTION).doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      "Seul un administrateur peut supprimer un utilisateur."
    );
  }

  // 3. Validation de l'argument `uid`.
  const uid = request.data && request.data.uid;
  if (typeof uid !== 'string' || uid.trim() === '') {
    throw new HttpsError(
      'invalid-argument',
      "L'identifiant de l'utilisateur (uid) est requis et doit être une chaîne non vide."
    );
  }

  // 4. Un admin ne peut pas se supprimer lui-même (évite un verrouillage / perte d'accès).
  if (uid === callerUid) {
    throw new HttpsError(
      'failed-precondition',
      "Un administrateur ne peut pas supprimer son propre compte."
    );
  }

  // 5a. Suppression du compte Firebase Auth.
  //     On tolère l'absence de compte (`auth/user-not-found`) : le document
  //     Firestore peut exister sans compte Auth associé, et inversement.
  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      // Le compte Auth n'existe pas (déjà supprimé ou jamais activé) : on continue.
    } else {
      throw new HttpsError(
        'internal',
        "Échec de la suppression du compte d'authentification.",
        error && error.message
      );
    }
  }

  // 5b. Suppression du document Firestore `users/{uid}`.
  await db.collection(USERS_COLLECTION).doc(uid).delete();

  // 6. Succès.
  return { success: true };
});
