// scripts/synchroniser-annuaire.js
//
// Reconstruit l'annuaire public de connexion (collection Firestore `annuaire`)
// à partir des utilisateurs de rôle « medecin ». À exécuter LOCALEMENT par un
// administrateur via le SDK Admin (fonctionne sur le plan gratuit Spark).
//
// C'est l'équivalent, hors interface, de la fonction syncAnnuaire() de
// l'application (src/services/annuaireService.js) et du bouton
// « Synchroniser l'annuaire ». Utile surtout pour le PEUPLEMENT INITIAL des
// médecins déjà existants, avant même que le nouveau frontend soit déployé.
//
// Idempotent + réconciliation : (ré)écrit annuaire/{uid} = { label, email }
// pour chaque médecin, et SUPPRIME toute entrée orpheline (uid qui n'est plus
// médecin — compte révoqué, promu admin, etc.).
//
// ── Prérequis (identiques à supprimer-compte-auth.js) ────────────────────────
// 1. Clé de compte de service : Console Firebase → Paramètres du projet →
//    Comptes de service → « Générer une nouvelle clé privée » (fichier JSON).
//    ⚠️ À conserver HORS du dépôt, ne jamais versionner.
// 2. cd scripts && npm install
//
// ── Utilisation ──────────────────────────────────────────────────────────────
//   GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/cle.json" \
//     node synchroniser-annuaire.js [--dry-run]
//
//   --dry-run : affiche ce qui serait écrit/supprimé, SANS rien modifier.

const admin = require('firebase-admin');

// Algorithme des libellés : miroir partagé dans lib/labels.js (voir son en-tête).
const { computeAnnuaireLabels } = require('./lib/labels');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Erreur : définissez GOOGLE_APPLICATION_CREDENTIALS avec le chemin absolu\n' +
      'vers la clé de compte de service (voir l\'en-tête de ce fichier).'
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const usersSnap = await db.collection('users').where('role', '==', 'medecin').get();
  const medecins = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const labels = computeAnnuaireLabels(medecins);
  const validIds = new Set(medecins.map((m) => m.id));

  const annuaireSnap = await db.collection('annuaire').get();

  const ops = [];
  medecins.forEach((m) => {
    if (!m.email) {
      console.warn(`⚠️  Médecin sans email, exclu de l'annuaire : ${m.id} (${m.prenom} ${m.nom})`);
      return;
    }
    ops.push({ type: 'set', id: m.id, data: { label: labels[m.id], email: m.email } });
  });
  annuaireSnap.forEach((d) => {
    if (!validIds.has(d.id)) ops.push({ type: 'delete', id: d.id });
  });

  const toWrite = ops.filter((o) => o.type === 'set');
  const toDelete = ops.filter((o) => o.type === 'delete');
  console.log(
    `${medecins.length} médecin(s) — ${toWrite.length} entrée(s) à écrire, ` +
    `${toDelete.length} orphelin(s) à retirer.`
  );

  if (dryRun) {
    ops.forEach((o) =>
      console.log(`  ${o.type.toUpperCase()} annuaire/${o.id}${o.data ? ` → « ${o.data.label} »` : ''}`)
    );
    console.log('(dry-run : aucune écriture effectuée)');
    process.exit(0);
  }

  let done = 0;
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    ops.slice(i, i + 450).forEach((op) => {
      const ref = db.collection('annuaire').doc(op.id);
      if (op.type === 'set') batch.set(ref, op.data);
      else batch.delete(ref);
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
    done += Math.min(450, ops.length - i);
  }

  console.log(`✅ Annuaire synchronisé (${done} opération(s)).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
