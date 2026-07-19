// scripts/supprimer-compte-auth.js
//
// Suppression DÉFINITIVE d'un compte de connexion Firebase Authentication,
// à exécuter LOCALEMENT par un administrateur. Fonctionne sur le plan gratuit
// (Spark) : seul le *déploiement* de Cloud Functions exige le plan Blaze, pas
// l'utilisation locale du SDK Admin.
//
// Pourquoi ce script ? Depuis l'application, supprimer un utilisateur efface son
// document Firestore, ce qui RÉVOQUE immédiatement tout accès (les règles de
// sécurité refusent tout à un compte sans rôle). En revanche, le compte de
// connexion (email) subsiste dans Firebase Auth et ne peut être effacé que par
// une opération serveur (SDK Admin). Ce script réalise cet effacement, utile
// pour la réutilisation d'un email ou une demande RGPD.
//
// ── Prérequis ────────────────────────────────────────────────────────────────
// 1. Générer une clé de compte de service :
//      Console Firebase → Paramètres du projet → Comptes de service
//      → « Générer une nouvelle clé privée ». Un fichier JSON est téléchargé.
//    ⚠️ Conservez ce fichier HORS du dépôt (ex. dans votre dossier personnel).
//       Il donne un accès complet au projet et ne doit JAMAIS être versionné.
// 2. Installer les dépendances du script :  cd scripts && npm install
//
// ── Utilisation ──────────────────────────────────────────────────────────────
//   GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
//     node supprimer-compte-auth.js <email-ou-uid> [--supprimer-doc]
//
//   --supprimer-doc : supprime aussi le document Firestore users/{uid}
//                     (normalement déjà fait via l'application).

const admin = require('firebase-admin');

async function main() {
  const cible = process.argv[2];
  const supprimerDoc = process.argv.includes('--supprimer-doc');

  if (!cible) {
    console.error('Usage : node supprimer-compte-auth.js <email-ou-uid> [--supprimer-doc]');
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Erreur : définissez GOOGLE_APPLICATION_CREDENTIALS avec le chemin absolu\n' +
      'vers la clé de compte de service (voir l\'en-tête de ce fichier).'
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });

  // Résoudre l'uid : si la cible contient « @ », on la traite comme un email.
  let uid = cible;
  if (cible.includes('@')) {
    const user = await admin.auth().getUserByEmail(cible);
    uid = user.uid;
    console.log(`Compte trouvé : ${cible} → uid ${uid}`);
  }

  await admin.auth().deleteUser(uid);
  console.log(`✅ Compte de connexion (Auth) supprimé — uid ${uid}.`);

  if (supprimerDoc) {
    await admin.firestore().collection('users').doc(uid).delete();
    console.log(`✅ Document Firestore users/${uid} supprimé.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
