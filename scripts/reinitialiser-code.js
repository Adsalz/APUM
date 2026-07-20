// scripts/reinitialiser-code.js
//
// Réinitialise le code d'UN médecin (cas « code oublié »).
//
//  1. Remet son compte dans l'état « à réclamer » (mot de passe = code de
//     réclamation partagé) : il redéfinira un nouveau code à 6 chiffres à sa
//     prochaine connexion (fenêtre d'inscription ouverte).
//  2. EFFACE ses desiderata : réinitialiser le code = repartir de zéro sur les
//     choix (comportement demandé).
//
// Prérequis : clé de compte de service + GOOGLE_APPLICATION_CREDENTIALS (ou ADC
// gcloud). cd scripts && npm install.
//
// Utilisation :
//   GOOGLE_APPLICATION_CREDENTIALS="/chemin/cle.json" \
//     node reinitialiser-code.js <email-ou-uid>

const admin = require('firebase-admin');

// ⚠️ DOIT correspondre EXACTEMENT à CODE_A_RECLAMER de src/constants/claim.js
const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

async function main() {
  const cible = process.argv[2];
  if (!cible) {
    console.error('Usage : node reinitialiser-code.js <email-ou-uid>');
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Erreur : définissez GOOGLE_APPLICATION_CREDENTIALS avec le chemin absolu\n' +
      'vers la clé de compte de service (voir scripts/README.md).'
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const auth = admin.auth();
  const db = admin.firestore();

  let uid = cible;
  if (cible.includes('@')) {
    const user = await auth.getUserByEmail(cible);
    uid = user.uid;
    console.log(`Compte trouvé : ${cible} → uid ${uid}`);
  }

  // 1. Remettre le compte « à réclamer »
  await auth.updateUser(uid, { password: CODE_A_RECLAMER });
  console.log('✅ Code remis « à réclamer » (le médecin le redéfinira à sa prochaine connexion).');

  // 2. Effacer les desiderata du médecin
  const desidSnap = await db.collection('desiderata').where('userId', '==', uid).get();
  const docs = desidSnap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
  console.log(`✅ ${docs.length} desiderata supprimé(s).`);

  console.log('ℹ️  Assure-toi que la fenêtre d\'inscription est OUVERTE (Gestion des utilisateurs) pour qu\'il puisse redéfinir son code.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
