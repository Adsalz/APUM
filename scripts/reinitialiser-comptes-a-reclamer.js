// scripts/reinitialiser-comptes-a-reclamer.js
//
// ROLLOUT (à lancer UNE fois, au passage au nouveau système de connexion).
//
// Met TOUS les comptes médecin dans l'état « à réclamer » : leur mot de passe
// devient le code de réclamation partagé. Après ça, chaque médecin définit son
// code à 6 chiffres à sa première connexion (fenêtre d'inscription ouverte,
// « premier code = le sien »).
//
// ⚠️ Cette opération invalide les mots de passe actuels des médecins :
// préviens-les AVANT, et n'ouvre la fenêtre d'inscription que quand tu es prêt.
//
// Prérequis identiques aux autres scripts : clé de compte de service +
// GOOGLE_APPLICATION_CREDENTIALS (ou ADC gcloud). cd scripts && npm install.
//
// Utilisation :
//   GOOGLE_APPLICATION_CREDENTIALS="/chemin/cle.json" \
//     node reinitialiser-comptes-a-reclamer.js [--dry-run]

const admin = require('firebase-admin');

// ⚠️ DOIT correspondre EXACTEMENT à CODE_A_RECLAMER de src/constants/claim.js
const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Erreur : définissez GOOGLE_APPLICATION_CREDENTIALS avec le chemin absolu\n' +
      'vers la clé de compte de service (voir scripts/README.md).'
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();
  const auth = admin.auth();

  const snap = await db.collection('users').where('role', '==', 'medecin').get();
  const medecins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`${medecins.length} médecin(s) trouvé(s).`);

  if (dryRun) {
    medecins.forEach((m) => console.log(`  (dry-run) remettrait « à réclamer » : ${m.email} (${m.id})`));
    console.log('(dry-run : aucune modification)');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  for (const m of medecins) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await auth.updateUser(m.id, { password: CODE_A_RECLAMER });
      ok += 1;
    } catch (e) {
      fail += 1;
      console.error(`  ❌ échec pour ${m.email} (${m.id}) : ${e.message}`);
    }
  }

  console.log(
    `✅ ${ok} compte(s) remis « à réclamer »` + (fail ? `, ${fail} échec(s)` : '') + '.'
  );
  console.log('ℹ️  Ouvre la fenêtre d\'inscription (Gestion des utilisateurs) pour permettre la définition des codes.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
