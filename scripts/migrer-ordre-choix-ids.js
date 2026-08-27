// scripts/migrer-ordre-choix-ids.js
//
// Convertit les ordres de choix stockés en NOMS vers des IDENTIFIANTS.
//
// ── POURQUOI ────────────────────────────────────────────────────────────────
// Un ordre de choix conservé sous forme de noms se rompt au premier renommage :
// le médecin renommé sort de la liste comme « parti » et y rentre comme
// « nouveau », sans la moindre erreur. C'est arrivé en production le
// 2026-08-26 — ZWANEVELD Nicole et BENOIT Grégoire s'étaient retrouvés parmi
// les arrivants après correction de leur fiche. L'identifiant Firebase, lui, ne
// bouge jamais.
//
// ⚠️ CE SCRIPT NE MARCHE QUE TANT QUE LES NOMS CORRESPONDENT ENCORE.
// Il rapproche `premierTour` (noms) contre l'annuaire courant, à l'identique.
// Chaque renommage effectué avant la migration est une correspondance perdue —
// d'où l'intérêt de le passer tôt. Le script REFUSE d'écrire s'il ne résout pas
// la totalité d'une liste : une liste amputée est pire que pas de migration.
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node migrer-ordre-choix-ids.js         # aperçu de tous les trimestres
//   node migrer-ordre-choix-ids.js --go    # écrit
//
// Options :
//   --projet <id>       projet Firebase (défaut : lu dans .firebaserc)
//   --periode <AAAA-MM> ne traiter que ce trimestre

const { creerSession } = require('./lib/session-cli');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const valeur = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const GO = flag('--go');
const PERIODE = valeur('--periode', null);

(async () => {
  const session = await creerSession({ projet: valeur('--projet', null) });

  const medecins = (await session.lister('users'))
    .filter((u) => u.role === 'medecin')
    .map((u) => ({ id: u.id, nomComplet: `${u.nom} ${u.prenom}`.trim() }));
  const idParNom = new Map(medecins.map((m) => [m.nomComplet, m.id]));

  const documents = (await session.lister('planning'))
    .filter((d) => d.id.startsWith('ordre_choix_'))
    .filter((d) => !PERIODE || d.id === `ordre_choix_${PERIODE}`)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (documents.length === 0) {
    console.log('Aucun ordre de choix à migrer.');
    return;
  }

  let aEcrire = 0;
  for (const doc of documents) {
    console.log(`\n── ${doc.id}  (${doc.libelle || 'sans libellé'})`);

    if (Array.isArray(doc.premierTourIds) && doc.premierTourIds.length > 0) {
      console.log(`   déjà en identifiants (${doc.premierTourIds.length}) — rien à faire.`);
      continue;
    }

    const noms = Array.isArray(doc.premierTour) ? doc.premierTour : [];
    if (noms.length === 0) { console.log('   ⚠️  document vide — ignoré.'); continue; }

    const nonResolus = noms.filter((n) => !idParNom.has(n));
    const premierTourIds = noms.map((n) => idParNom.get(n)).filter(Boolean);
    const doublons = premierTourIds.filter((id, i, t) => t.indexOf(id) !== i);

    console.log(`   ${noms.length} noms → ${premierTourIds.length} identifiants résolus`);
    if (nonResolus.length) {
      console.log(`   ✗ ${nonResolus.length} nom(s) sans compte correspondant :`);
      nonResolus.forEach((n) => console.log(`       « ${n} »`));
      console.log('   → non migré. Corrigez la fiche du médecin, ou retirez-le de la liste.');
      continue;
    }
    if (doublons.length) {
      console.log(`   ✗ deux noms pointent le même compte (${doublons.length}) — non migré.`);
      continue;
    }

    aEcrire++;
    if (!GO) { console.log('   ✓ migrable (aperçu — rien écrit).'); continue; }

    // `ecrire` remplace le document ENTIER : tout champ non reporté est perdu.
    // `updatedAt` est un Timestamp Firestore, que l'encodeur REST de session-cli
    // ne sait pas réécrire tel quel ; on en conserve la valeur sous `figeLe`
    // (chaîne ISO) plutôt que de la perdre ou d'en changer le type.
    // Selon la forme renvoyée par l'API REST, un Timestamp arrive soit comme
    // { timestampValue }, soit déjà aplati en chaîne. On accepte les deux plutôt
    // que de perdre la date (c'est arrivé lors de la migration du 2026-08-27,
    // rattrapée à la main).
    const brutDate = doc.updatedAt ?? doc.figeLe ?? null;
    const figeLe = (brutDate && typeof brutDate === 'object')
      ? (brutDate.timestampValue || null)
      : brutDate;
    await session.ecrire(`planning/${doc.id}`, {
      idPeriode: doc.idPeriode || doc.id.replace('ordre_choix_', ''),
      libelle: doc.libelle || null,
      baseSur: doc.baseSur || null,
      source: doc.source || null,
      figeLe,
      premierTourIds,
      deuxiemeTourIds: [...premierTourIds].reverse(),
      premierTour: noms,
      deuxiemeTour: [...noms].reverse(),
    });
    console.log('   ✓ migré.');
  }

  if (!GO && aEcrire > 0) {
    console.log(`\n${aEcrire} document(s) migrable(s). Ajoutez --go pour écrire.`);
  }
})().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
