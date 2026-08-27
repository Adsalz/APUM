// scripts/rapprocher-annuaire.js
//
// Rapproche la LISTE PAPIER des régulateurs (« MEDECINS REGULATEURS LIBERAUX DU
// CENTRE 15 », transcrite en JSON hors dépôt) et les comptes réels du projet
// Firebase. Produit un rapport : qui manque, qui est parti, quels emails et
// quelles orthographes divergent.
//
// PAR DÉFAUT : lecture seule, rien n'est écrit.
//
// Authentification par la SESSION DU CLI FIREBASE — aucune clé de compte de
// service (`npx firebase-tools login` une fois si besoin), comme
// basculer-periode-saisie.js.
//
// ── Ce que --go applique, et ce qu'il n'applique PAS ─────────────────────────
// --go corrige uniquement l'EMAIL des comptes existants, la liste papier
// faisant référence. Le changement touche à la fois Firebase Auth (identifiant
// de connexion) et `users/{uid}` — les deux DOIVENT rester alignés, la
// connexion médecin résolvant l'email via l'annuaire.
//
// --go ne touche PAS aux noms : la liste papier écrit les noms de famille en
// CAPITALES par convention typographique, les recopier passerait tout l'affichage
// de l'application en majuscules. Les orthographes réellement divergentes sont
// signalées dans le rapport, à corriger à la main (Gestion des utilisateurs).
//
// --go ne CRÉE ni ne SUPPRIME jamais de compte :
//  - créer = `creer-comptes-medecins.js`, ou l'application
//    (Gestion des utilisateurs → Ajouter un utilisateur) ;
//  - supprimer = révocation d'accès + effacement RGPD → passe par
//    l'application puis scripts/supprimer-compte-auth.js.
// Ces deux cas sont listés dans le rapport, à décider humainement.
//
// ⚠️ Après un --go, relance IMPÉRATIVEMENT `node synchroniser-annuaire.js` :
// l'annuaire public conserve sinon l'ANCIEN email, et la liste déroulante de
// connexion enverrait le médecin sur une adresse qui n'existe plus dans Auth.
//
// ── La liste papier ──────────────────────────────────────────────────────────
// Fichier NOMINATIF, gitignoré (RGPD) : ../annuaire-medecins-2026-2027.json
// Format : { "medecins": [ { nom, prenom, email, actif? } ] } ou un tableau nu.
// Une ligne `"actif": false` (médecin qui ne régule plus) est ignorée.
//
// ── Utilisation ──────────────────────────────────────────────────────────────
//   node rapprocher-annuaire.js            # rapport seul
//   node rapprocher-annuaire.js --go       # + corrige les emails
//
// Options : --liste <fichier>, --projet <id>, --go.

const path = require('path');
const { cleNom, cleEmail, nomComplet: nom, chargerListe, rapprocher, trierACreer } = require('./lib/rapprochement');
const { creerSession } = require('./lib/session-cli');

const LISTE_PAR_DEFAUT = path.join(__dirname, '..', 'annuaire-medecins-2026-2027.json');

const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
};

async function main() {
  const go = process.argv.includes('--go');
  const fichier = argValue('--liste') || LISTE_PAR_DEFAUT;

  let actifs;
  let inactifs;
  try {
    ({ actifs, inactifs } = chargerListe(fichier));
  } catch (e) {
    console.error(`Erreur : ${e.message}`);
    process.exit(1);
  }

  const session = await creerSession({ projet: argValue('--projet') });

  // On lit TOUS les utilisateurs, pas seulement les médecins : un régulateur de
  // la liste peut avoir un compte de rôle « admin » (il ne serait alors pas un
  // compte à créer, mais un compte à ne pas toucher).
  const tous = await session.lister('users');
  const medecins = tous.filter((u) => u.role === 'medecin');
  const autres = tous.filter((u) => u.role !== 'medecin');

  const { paires, aCreer, aRetirer } = rapprocher(actifs, medecins);

  const emailsDivergents = paires.filter(
    (x) => cleEmail(x.papier.email) !== cleEmail(x.base.email)
  );
  // Comparaison sur la clé normalisée : casse, accents et tirets ne sont PAS
  // des divergences (le papier écrit les noms en capitales). Seule une
  // orthographe réellement différente ressort.
  const nomsDivergents = paires.filter(
    (x) => cleNom(x.papier.nom, x.papier.prenom) !== cleNom(x.base.nom, x.base.prenom)
  );

  const { dejaAutreRole, vraimentACreer } = trierACreer(aCreer, autres);

  console.log(`\nProjet : ${session.projet}`);
  console.log(
    `Liste papier : ${actifs.length} régulateur(s) actif(s)` +
    (inactifs.length ? `, ${inactifs.length} ignoré(s) (ne régulent plus)` : '') +
    ` — ${path.basename(fichier)}`
  );
  console.log(`Base : ${medecins.length} médecin(s), ${autres.length} autre(s) compte(s).\n`);

  const signales = new Set([...emailsDivergents, ...nomsDivergents]);
  console.log(`✅ ${paires.length - signales.size} compte(s) concordant(s).`);

  console.log(`\n➕ ${vraimentACreer.length} à créer (dans la liste, absent(s) de la base) :`);
  vraimentACreer.forEach((p) => console.log(`   ${nom(p)} — ${p.email}`));

  console.log(`\n➖ ${aRetirer.length} à retirer (compte médecin absent de la liste) :`);
  aRetirer.forEach((b) => console.log(`   ${nom(b)} — ${b.email} (${b.id})`));

  console.log(`\n✉️  ${emailsDivergents.length} email(s) divergent(s) — la liste papier fait référence :`);
  emailsDivergents.forEach((x) =>
    console.log(`   ${nom(x.papier)} : base « ${x.base.email} » → papier « ${x.papier.email} » (${x.base.id})`)
  );

  console.log(
    `\n👤 ${nomsDivergents.length} orthographe(s) de nom divergente(s) ` +
    '— à corriger à la main, --go n\'y touche pas (casse et accents ignorés) :'
  );
  nomsDivergents.forEach((x) =>
    console.log(`   base « ${nom(x.base)} » → papier « ${nom(x.papier)} » (${x.base.id})`)
  );

  if (dejaAutreRole.length) {
    console.log(`\nℹ️  ${dejaAutreRole.length} régulateur(s) présent(s) en base sous un AUTRE rôle (non touché) :`);
    dejaAutreRole.forEach((x) =>
      console.log(`   ${nom(x.papier)} — rôle « ${x.base.role} » (${x.base.id})`)
    );
  }

  if (inactifs.length) {
    console.log(`\n🚪 ${inactifs.length} sur le papier mais marqué(s) « ne régule plus » (ignoré(s)) :`);
    inactifs.forEach((p) => console.log(`   ${nom(p)} — ${p.email}`));
  }

  const aCorriger = emailsDivergents;

  if (!go) {
    console.log(
      `\n(lecture seule : aucune écriture)\n` +
      `   --go corrigerait ${aCorriger.length} email(s) (Auth + Firestore).\n` +
      `   Créations : node creer-comptes-medecins.js — suppressions : voir l'en-tête.\n`
    );
    process.exit(0);
  }

  if (aCorriger.length === 0) {
    console.log('\nAucun email à corriger.\n');
    process.exit(0);
  }

  console.log(`\n▶ Correction de ${aCorriger.length} email(s)…`);
  let ok = 0;
  let echecs = 0;
  for (const x of aCorriger) {
    const nouvelEmail = cleEmail(x.papier.email);
    try {
      // Auth D'ABORD : si l'email est déjà pris par un autre compte, on échoue
      // AVANT d'avoir désaligné Firestore (qui casserait la connexion).
      // eslint-disable-next-line no-await-in-loop
      await session.majEmail(x.base.id, nouvelEmail);
      // eslint-disable-next-line no-await-in-loop
      await session.majChamps(`users/${x.base.id}`, { email: nouvelEmail });
      ok += 1;
      console.log(`   ✔ ${nom(x.papier)} — ${x.base.email} → ${nouvelEmail}`);
    } catch (e) {
      echecs += 1;
      console.error(`   ❌ ${nom(x.papier)} (${x.base.id}) : ${e.message}`);
    }
  }

  console.log(`\n✅ ${ok} email(s) corrigé(s)` + (echecs ? `, ${echecs} échec(s)` : '') + '.');
  console.log('▶ Relance maintenant : node synchroniser-annuaire.js  (libellés + emails de la liste de connexion)\n');
  process.exit(echecs ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
