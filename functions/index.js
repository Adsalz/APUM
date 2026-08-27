// functions/index.js
//
// Une seule fonction : `lancerNouveauTour`, appelée par l'écran
// « Définir la période de saisie » quand l'administrateur coche
// « Nouveau tour de choix ».
//
// ── Pourquoi une Cloud Function ──────────────────────────────────────────────
// Le SDK client Firebase ne peut changer que le mot de passe de l'utilisateur
// CONNECTÉ. Effacer le code des 54 médecins exige les droits projet, dont un
// navigateur ne dispose pas — d'où ce code exécuté côté serveur. (Le projet est
// sur le plan Blaze : l'extension Trigger Email y tourne déjà.)
//
// L'équivalent hors application reste `scripts/nouveaux-choix.js`, utile en
// dépannage si le déploiement des fonctions est cassé.
//
// ── Ce que fait la fonction ──────────────────────────────────────────────────
//  1. vérifie que l'appelant est un ADMINISTRATEUR (rôle lu dans users/{uid} :
//     un jeton valide ne suffit pas, n'importe quel médecin en a un) ;
//  2. remet le mot de passe de tous les comptes `role: 'medecin'` à la valeur
//     partagée CODE_A_RECLAMER → à sa prochaine connexion, chacun fixe le code
//     à 6 chiffres qu'il tape, pour tout le trimestre ;
//  3. ouvre la fenêtre d'inscription (config/inscription.open), EN DERNIER :
//     sans elle, un code effacé ne peut pas être redéfini, donc plus personne
//     ne se connecte.
//
// La période de saisie, elle, est écrite par le navigateur avant l'appel (les
// règles Firestore l'autorisent déjà aux admins) — inutile de la refaire ici.
//
// Les desiderata ne sont JAMAIS touchés.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

// ⚠️ DOIT correspondre EXACTEMENT à CODE_A_RECLAMER de src/constants/claim.js
// (même contrainte que scripts/nouveaux-choix.js).
const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

// Traitées par paquets : 54 comptes en série tiendraient dans le délai, mais
// autant ne pas frôler la limite si l'effectif grossit.
const TAILLE_LOT = 10;

exports.lancerNouveauTour = onCall(
  { region: 'europe-west1', timeoutSeconds: 300, maxInstances: 2 },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Connexion requise.');
    }

    const db = admin.firestore();
    const appelant = await db.doc(`users/${uid}`).get();
    if (!appelant.exists || appelant.data().role !== 'admin') {
      logger.warn('Tentative de nouveau tour par un non-administrateur', { uid });
      throw new HttpsError('permission-denied', 'Réservé aux administrateurs.');
    }

    const snap = await db.collection('users').where('role', '==', 'medecin').get();
    const medecins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logger.info('Nouveau tour de choix', { par: uid, medecins: medecins.length });

    const echecs = [];
    let ok = 0;

    for (let i = 0; i < medecins.length; i += TAILLE_LOT) {
      const lot = medecins.slice(i, i + TAILLE_LOT);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        lot.map(async (m) => {
          try {
            await admin.auth().updateUser(m.id, { password: CODE_A_RECLAMER });
            ok += 1;
          } catch (e) {
            // Un compte Firestore sans compte Auth (suppression partielle) tombe
            // ici : on le signale sans faire échouer tout le tour.
            echecs.push({ email: m.email || m.id, message: e.message });
            logger.error('Échec de la remise à zéro', { uid: m.id, message: e.message });
          }
        })
      );
    }

    // En dernier, une fois les codes effacés : ouvrir avant laisserait une
    // fenêtre inutile, ouvrir jamais bloquerait tout le monde dehors.
    await db.doc('config/inscription').set({ open: true });

    logger.info('Nouveau tour terminé', { ok, echecs: echecs.length });
    return { total: medecins.length, ok, echecs };
  }
);
