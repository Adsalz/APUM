// scripts/migrer-alias-connexion.js
//
// Remplace l'adresse email RÉELLE de chaque médecin, utilisée jusqu'ici comme
// identifiant de connexion, par un ALIAS opaque « <uid>@apum-login.invalid ».
//
// POURQUOI : la collection `annuaire` est en LECTURE PUBLIQUE — la liste
// déroulante de connexion doit être peuplée avant toute authentification. Elle
// contenait l'adresse de connexion, c'est-à-dire l'adresse réelle : n'importe
// qui pouvait donc télécharger les 53 adresses personnelles des médecins
// (vérifié par requête anonyme le 16/10/2026). Après migration, l'annuaire ne
// contient plus rien de personnel ; l'adresse réelle ne vit que dans `users`,
// fermé aux non-authentifiés.
//
// Ce que fait le script, pour chaque médecin :
//   1. Firebase Auth   : l'email du compte devient l'alias ;
//   2. users/{uid}     : + emailConnexion = alias (email réel inchangé) ;
//   3. annuaire/{uid}  : email = alias (label inchangé).
//
// Le CODE À 6 CHIFFRES N'EST PAS TOUCHÉ : le médecin se reconnecte avec le même
// code, en choisissant le même nom dans la liste. Il sera probablement
// déconnecté une fois (Firebase invalide les sessions au changement d'email).
//
// ⚠️ À faire APRÈS une sauvegarde (node sauvegarder-firestore.js) et AVANT de
// déployer le code qui attend les alias. Les admins ne sont pas concernés :
// ils gardent leur adresse réelle comme identifiant (réinitialisation par email).
//
// ── Authentification ────────────────────────────────────────────────────────
//   npx firebase-tools login        (une fois, si besoin)
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node migrer-alias-connexion.js                      # aperçu, n'écrit rien
//   node migrer-alias-connexion.js --go                 # migre réellement
//   node migrer-alias-connexion.js --restaurer <fichier> --go   # revient en arrière
//
// Options :
//   --go                    exécute réellement (sans lui : simple aperçu)
//   --projet <id>           projet Firebase (défaut : lu dans .firebaserc)
//   --sauvegarde <fichier>  état d'avant (défaut : ~/apum-alias-avant-<horodatage>.json)
//   --restaurer <fichier>   remet les adresses réelles d'une sauvegarde
//
// Rejouable : un médecin déjà migré est détecté et ignoré.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerSession } = require('./lib/session-cli');
const { aliasConnexion, estAliasConnexion } = require('./lib/alias');

const argv = process.argv.slice(2);
const option = (nom, defaut = null) => {
  const i = argv.indexOf(nom);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : defaut;
};
const drapeau = (nom) => argv.includes(nom);

const REEL = drapeau('--go');
const horodatage = new Date().toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-');
const FICHIER_SAUVEGARDE = option('--sauvegarde', path.join(os.homedir(), `apum-alias-avant-${horodatage}.json`));

const nomComplet = (u) => `${(u.nom || '').toUpperCase()} ${u.prenom || ''}`.trim();

async function migrer(session) {
  const utilisateurs = await session.lister('users');
  const medecins = utilisateurs.filter((u) => u.role === 'medecin');
  const annuaire = await session.lister('annuaire');
  const labels = Object.fromEntries(annuaire.map((a) => [a.id, a.label]));

  console.log(`${medecins.length} médecin(s) dans users.\n`);

  const aMigrer = [];
  const dejaFaits = [];
  const problemes = [];

  for (const medecin of medecins) {
    // eslint-disable-next-line no-await-in-loop
    const compte = await session.lireCompte(medecin.id);
    if (!compte) {
      problemes.push(`${nomComplet(medecin)} — aucun compte de connexion (uid ${medecin.id})`);
      continue;
    }
    const alias = aliasConnexion(medecin.id);
    if (estAliasConnexion(compte.email) && estAliasConnexion(medecin.emailConnexion)) {
      dejaFaits.push(medecin);
      continue;
    }
    // Collision théorique : deux uid qui ne diffèrent que par la casse
    // donneraient le même alias (Firebase met les adresses en minuscules).
    // eslint-disable-next-line no-await-in-loop
    const occupant = await session.chercherParEmail(alias);
    if (occupant && occupant !== medecin.id) {
      problemes.push(`${nomComplet(medecin)} — l'alias ${alias} appartient déjà à ${occupant}`);
      continue;
    }
    aMigrer.push({ medecin, alias, emailAuth: compte.email, label: labels[medecin.id] || null });
  }

  if (dejaFaits.length > 0) { console.log(`✓ ${dejaFaits.length} déjà migré(s), ignoré(s).`); }
  if (problemes.length > 0) {
    console.log(`\n⚠️  ${problemes.length} cas à régler à la main :`);
    problemes.forEach((p) => console.log(`   ${p}`));
  }

  if (aMigrer.length === 0) {
    console.log('\nRien à migrer.');
    return;
  }

  console.log(`\n${aMigrer.length} médecin(s) à migrer :`);
  aMigrer.slice(0, 5).forEach(({ medecin, alias }) =>
    console.log(`   ${nomComplet(medecin)} → ${alias}`));
  if (aMigrer.length > 5) { console.log(`   … et ${aMigrer.length - 5} autres`); }

  // L'état d'avant est écrit DANS TOUS LES CAS, aperçu compris : c'est le seul
  // moyen de revenir en arrière, il doit exister avant la première écriture.
  const sauvegarde = {
    migreLe: new Date().toISOString(),
    projet: session.projet,
    comptes: aMigrer.map(({ medecin, alias, emailAuth, label }) => ({
      uid: medecin.id,
      nom: medecin.nom,
      prenom: medecin.prenom,
      emailAuthAvant: emailAuth,
      emailUsers: medecin.email || null,
      labelAnnuaire: label,
      aliasApres: alias,
    })),
  };
  fs.writeFileSync(FICHIER_SAUVEGARDE, JSON.stringify(sauvegarde, null, 2), 'utf8');
  console.log(`\nÉtat d'avant écrit : ${FICHIER_SAUVEGARDE}`);

  if (!REEL) {
    console.log('\nAperçu : rien n\'a été modifié. Ajoutez --go pour migrer réellement.');
    return;
  }

  let faits = 0;
  for (const { medecin, alias, label } of aMigrer) {
    try {
      // Ordre important : le compte d'abord, l'annuaire ensuite. Entre les deux
      // la connexion de CE médecin échouerait (l'annuaire pointe l'ancienne
      // adresse) — quelques centaines de millisecondes, pour un seul médecin.
      // eslint-disable-next-line no-await-in-loop
      await session.majEmail(medecin.id, alias);
      // eslint-disable-next-line no-await-in-loop
      await session.majChamps(`users/${medecin.id}`, { emailConnexion: alias });
      if (label) {
        // eslint-disable-next-line no-await-in-loop
        await session.ecrire(`annuaire/${medecin.id}`, { label, email: alias });
      }
      faits += 1;
      console.log(`   ✓ ${nomComplet(medecin)}`);
    } catch (e) {
      console.error(`   ❌ ${nomComplet(medecin)} : ${e.message}`);
    }
  }

  console.log(`\n✅ ${faits}/${aMigrer.length} migré(s).`);
  if (faits < aMigrer.length) {
    console.log('Relancez le script : il reprendra là où il s\'est arrêté.');
  }
  console.log(`Retour en arrière : node migrer-alias-connexion.js --restaurer "${FICHIER_SAUVEGARDE}" --go`);
}

async function restaurer(session, fichier) {
  const { comptes } = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  console.log(`${REEL ? 'Restauration' : 'APERÇU de la restauration'} de ${comptes.length} compte(s)`);

  if (!REEL) {
    comptes.slice(0, 5).forEach((c) =>
      console.log(`   ${(c.nom || '').toUpperCase()} ${c.prenom} ← ${c.emailAuthAvant}`));
    console.log('\nAjoutez --go pour restaurer réellement.');
    return;
  }

  let faits = 0;
  for (const c of comptes) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await session.majEmail(c.uid, c.emailAuthAvant);
      if (c.labelAnnuaire) {
        // eslint-disable-next-line no-await-in-loop
        await session.ecrire(`annuaire/${c.uid}`, { label: c.labelAnnuaire, email: c.emailAuthAvant });
      }
      // emailConnexion est laissé en place : il ne gêne pas et documente le
      // passage. La version de l'application d'avant la migration ne le lit pas.
      faits += 1;
    } catch (e) {
      console.error(`   ❌ ${c.uid} : ${e.message}`);
    }
  }
  console.log(`\n✅ ${faits}/${comptes.length} restauré(s).`);
}

(async () => {
  const session = await creerSession({ projet: option('--projet') });
  const aRestaurer = option('--restaurer');
  if (aRestaurer) { await restaurer(session, aRestaurer); return; }
  await migrer(session);
})().catch((error) => {
  console.error('Échec :', error.message);
  process.exitCode = 1;
});
