// scripts/creer-comptes-medecins.js
//
// Crée les comptes médecin présents sur la LISTE PAPIER des régulateurs mais
// absents de la base — l'équivalent, en lot, de « Gestion des utilisateurs →
// Ajouter un utilisateur » dans l'application.
//
// Pour chaque manquant, à l'identique du parcours de l'app
// (authService.registerUser + userService.createUser) :
//   1. compte Firebase Auth dont le mot de passe est le CODE_A_RECLAMER partagé
//      → le compte est « à réclamer », le médecin choisira son code à 6 chiffres
//        à sa première connexion (« premier code = le sien ») ;
//   2. document `users/{uid}` = { nom, prenom, email, role: 'medecin' }.
// Aucun email n'est envoyé.
//
// PAR DÉFAUT : aperçu, rien n'est écrit. `--go` crée réellement.
//
// Authentification par la SESSION DU CLI FIREBASE — aucune clé de compte de
// service (`npx firebase-tools login` une fois si besoin).
//
// Qui est « manquant » est déterminé par la MÊME logique que
// `rapprocher-annuaire.js` (lib/rapprochement.js) : lance-le d'abord pour
// relire la liste avant de créer quoi que ce soit. Une ligne `"actif": false`
// (médecin qui ne régule plus) est ignorée.
//
// ── Reprise après échec ──────────────────────────────────────────────────────
// Réexécutable sans risque. Si un compte Auth existe déjà pour l'adresse (essai
// précédent interrompu, ou compte supprimé depuis l'app — qui efface le document
// Firestore mais PAS le compte de connexion), son uid est RÉUTILISÉ et seul le
// document Firestore est écrit. Le mot de passe d'un compte Auth existant n'est
// JAMAIS réinitialisé : un médecin ayant déjà choisi son code le conserve (pour
// le remettre « à réclamer », c'est reinitialiser-code.js, qui efface aussi ses
// desiderata).
//
// ⚠️ Un compte Auth orphelin appartient souvent à quelqu'un qui est PARTI (c'est
// pour ça que son document a été supprimé). Le recréer le réactive : vérifie la
// liste avant, et marque `"actif": false` ceux qui ne régulent plus.
//
// ── Après la création ────────────────────────────────────────────────────────
//  1. `node synchroniser-annuaire.js` — sans quoi les nouveaux n'apparaissent
//     PAS dans la liste déroulante de connexion ;
//  2. la FENÊTRE D'INSCRIPTION doit être ouverte (app → Gestion des
//     utilisateurs) pour qu'ils puissent définir leur code. Le script affiche
//     son état courant.
//
// ── Utilisation ──────────────────────────────────────────────────────────────
//   node creer-comptes-medecins.js          # aperçu
//   node creer-comptes-medecins.js --go     # création réelle
//
// Options : --liste <fichier>, --projet <id>, --go.

const path = require('path');
const { cleEmail, nomComplet: nom, chargerListe, rapprocher, trierACreer } = require('./lib/rapprochement');
const { creerSession } = require('./lib/session-cli');

// ⚠️ DOIT correspondre EXACTEMENT à CODE_A_RECLAMER de src/constants/claim.js
// (même contrainte que reinitialiser-comptes-a-reclamer.js).
const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

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

  const tous = await session.lister('users');
  const medecins = tous.filter((u) => u.role === 'medecin');
  const autres = tous.filter((u) => u.role !== 'medecin');

  const { aCreer } = rapprocher(actifs, medecins);
  const { dejaAutreRole, vraimentACreer } = trierACreer(aCreer, autres);

  console.log(`\nProjet : ${session.projet}`);
  console.log(
    `Liste papier : ${actifs.length} régulateur(s) actif(s)` +
    (inactifs.length ? `, ${inactifs.length} ignoré(s) (ne régulent plus)` : '') +
    ` — ${path.basename(fichier)}`
  );
  console.log(`Base : ${medecins.length} médecin(s).`);

  if (dejaAutreRole.length) {
    console.log(`\nℹ️  ${dejaAutreRole.length} ignoré(s), déjà en base sous un autre rôle :`);
    dejaAutreRole.forEach((x) => console.log(`   ${nom(x.papier)} — rôle « ${x.base.role} »`));
  }

  if (vraimentACreer.length === 0) {
    console.log('\nAucun compte à créer : la base couvre toute la liste.\n');
    process.exit(0);
  }

  console.log(`\n${vraimentACreer.length} compte(s) à créer :`);
  vraimentACreer.forEach((p) => console.log(`   ${nom(p)} — ${cleEmail(p.email)}`));

  if (!go) {
    console.log('\n(aperçu : aucune écriture) — relancez avec --go pour créer.\n');
    process.exit(0);
  }

  console.log('\n▶ Création…');
  let crees = 0;
  let repris = 0;
  let echecs = 0;

  for (const p of vraimentACreer) {
    const email = cleEmail(p.email);
    try {
      // Un compte Auth peut préexister (document supprimé sans le compte de
      // connexion) : on le raccroche au lieu d'échouer, sans toucher son code.
      // eslint-disable-next-line no-await-in-loop
      let uid = await session.chercherParEmail(email);
      const orphelin = Boolean(uid);
      if (!uid) {
        // eslint-disable-next-line no-await-in-loop
        uid = await session.creerCompte(email, CODE_A_RECLAMER);
      }

      // eslint-disable-next-line no-await-in-loop
      await session.ecrire(`users/${uid}`, {
        nom: (p.nom || '').trim(),
        prenom: (p.prenom || '').trim(),
        email,
        role: 'medecin',
      });

      if (orphelin) {
        repris += 1;
        console.log(`   ✔ ${nom(p)} — compte Auth orphelin raccroché (${uid}), code inchangé`);
      } else {
        crees += 1;
        console.log(`   ✔ ${nom(p)} — créé « à réclamer » (${uid})`);
      }
    } catch (e) {
      echecs += 1;
      console.error(`   ❌ ${nom(p)} <${email}> : ${e.message}`);
    }
  }

  console.log(
    `\n✅ ${crees} compte(s) créé(s)` +
    (repris ? `, ${repris} compte(s) Auth orphelin(s) raccroché(s)` : '') +
    (echecs ? `, ${echecs} échec(s)` : '') + '.'
  );

  const conf = await session.get('config/inscription');
  console.log('\n▶ Étape suivante : node synchroniser-annuaire.js  (sinon absents de la liste de connexion)');
  console.log(
    conf && conf.open === true
      ? 'ℹ️  Fenêtre d\'inscription OUVERTE : ils peuvent définir leur code dès maintenant.'
      : '⚠️  Fenêtre d\'inscription FERMÉE : ouvre-la (app → Gestion des utilisateurs), sinon ils ne pourront pas définir leur code.'
  );
  console.log('');
  process.exit(echecs ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Échec :', (err && err.message) || err);
  process.exit(1);
});
