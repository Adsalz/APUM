// scripts/sauvegarder-firestore.js
//
// Sauvegarde complète de la base Firestore dans un dossier local.
//
// POURQUOI : le projet est sur le plan gratuit (Spark). Les exports Firestore
// planifiés de Google exigent le plan Blaze, et il n'existe aucune autre copie
// des données : une suppression malencontreuse (script d'admin, mauvaise
// manipulation dans la console) effacerait les desiderata et les plannings de
// l'année sans recours. Ce script est la parade gratuite : on l'exécute depuis
// un poste, il écrit un JSON par collection.
//
// ⚠️ RGPD : la sauvegarde contient des données nominatives (noms, emails,
// disponibilités des médecins). Elle est écrite HORS du dépôt git, dans le
// dossier personnel. Ne la déposez jamais sur un service partagé non maîtrisé.
//
// ── Authentification ────────────────────────────────────────────────────────
// Réutilise la session du CLI Firebase — aucune clé de compte de service.
//   npx firebase-tools login        (une fois, si besoin)
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node sauvegarder-firestore.js                    # sauvegarde + rotation
//   node sauvegarder-firestore.js --lister           # liste les sauvegardes
//   node sauvegarder-firestore.js --dossier ~/ailleurs --conserver 20
//   node sauvegarder-firestore.js --restaurer "~/Sauvegardes APUM/apum-..."        # aperçu
//   node sauvegarder-firestore.js --restaurer "~/Sauvegardes APUM/apum-..." --go   # réécrit
//
// Options :
//   --dossier <chemin>    où écrire (défaut : ~/Sauvegardes APUM)
//   --conserver <n>       nombre de sauvegardes gardées (défaut : 12)
//   --projet <id>         projet Firebase (défaut : lu dans .firebaserc)
//   --lister              n'écrit rien, affiche les sauvegardes existantes
//   --restaurer <dossier> réécrit les documents d'une sauvegarde (aperçu sans --go)
//
// La restauration RÉÉCRIT les documents sauvegardés par-dessus ceux en place.
// Elle ne supprime rien : un document créé après la sauvegarde survit.
//
// ── Automatisation (facultatif, macOS) ──────────────────────────────────────
// Pour une sauvegarde hebdomadaire automatique, créez un agent launchd qui
// lance ce script — voir scripts/README.md.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerSession } = require('./lib/session-cli');

// Toutes les collections de l'application (src/services/*.js). `config` et
// `planning` portent aussi la période de saisie, la clôture et l'ordre de choix.
const COLLECTIONS = ['users', 'desiderata', 'planning', 'annuaire', 'config'];

const PREFIXE_DOSSIER = 'apum-';

const argv = process.argv.slice(2);
const option = (nom, defaut = null) => {
  const i = argv.indexOf(nom);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : defaut;
};
const drapeau = (nom) => argv.includes(nom);

const dossierRacine = option('--dossier', path.join(os.homedir(), 'Sauvegardes APUM'));
const conserver = Math.max(1, Number(option('--conserver', '12')) || 12);

// « apum-2026-10-16T09-30-00 » : triable alphabétiquement = triable par date.
const horodatage = () => new Date().toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-');

const sauvegardesExistantes = () => {
  if (!fs.existsSync(dossierRacine)) { return []; }
  return fs.readdirSync(dossierRacine)
    .filter((nom) => nom.startsWith(PREFIXE_DOSSIER))
    .filter((nom) => fs.statSync(path.join(dossierRacine, nom)).isDirectory())
    .sort();
};

const tailleLisible = (octets) =>
  octets > 1024 * 1024 ? `${(octets / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(octets / 1024)} ko`;

const lister = () => {
  const dossiers = sauvegardesExistantes();
  if (dossiers.length === 0) {
    console.log(`Aucune sauvegarde dans ${dossierRacine}`);
    return;
  }
  console.log(`${dossiers.length} sauvegarde(s) dans ${dossierRacine} :`);
  dossiers.reverse().forEach((nom) => {
    const chemin = path.join(dossierRacine, nom);
    const octets = fs.readdirSync(chemin)
      .reduce((total, f) => total + fs.statSync(path.join(chemin, f)).size, 0);
    console.log(`  ${nom.slice(PREFIXE_DOSSIER.length)}  (${tailleLisible(octets)})`);
  });
};

// Supprime les sauvegardes les plus anciennes au-delà de `conserver`.
const fairePlace = () => {
  const dossiers = sauvegardesExistantes();
  const aSupprimer = dossiers.slice(0, Math.max(0, dossiers.length - conserver));
  aSupprimer.forEach((nom) => {
    fs.rmSync(path.join(dossierRacine, nom), { recursive: true, force: true });
    console.log(`  rotation : ${nom} supprimée`);
  });
  return aSupprimer.length;
};

// Réécrit les documents d'une sauvegarde. Aperçu par défaut : rien n'est
// touché tant que --go n'est pas passé.
async function restaurer(dossier) {
  const manifeste = path.join(dossier, 'manifeste.json');
  if (!fs.existsSync(manifeste)) {
    throw new Error(`${dossier} ne ressemble pas à une sauvegarde (manifeste.json absent).`);
  }
  const session = await creerSession({ projet: option('--projet') });
  const reel = drapeau('--go');

  console.log(`${reel ? 'Restauration' : 'APERÇU de la restauration'} de ${dossier} → ${session.projet}`);

  let total = 0;
  for (const nom of COLLECTIONS) {
    const fichier = path.join(dossier, `${nom}.json`);
    if (!fs.existsSync(fichier)) { continue; }
    const { documents } = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    console.log(`  ${nom} : ${documents.length} document(s)${reel ? '' : ' (non écrits)'}`);
    if (reel) {
      for (const doc of documents) {
        // eslint-disable-next-line no-await-in-loop
        await session.ecrireBrut(`${nom}/${doc.id}`, doc.fields);
      }
    }
    total += documents.length;
  }

  if (reel) {
    console.log(`\n✅ ${total} documents réécrits.`);
  } else {
    console.log(`\n${total} documents seraient réécrits. Ajoutez --go pour le faire réellement.`);
  }
}

async function principal() {
  if (drapeau('--lister')) { lister(); return; }

  const aRestaurer = option('--restaurer');
  if (aRestaurer) { await restaurer(aRestaurer); return; }

  const session = await creerSession({ projet: option('--projet') });
  const cible = path.join(dossierRacine, `${PREFIXE_DOSSIER}${horodatage()}`);
  fs.mkdirSync(cible, { recursive: true });

  console.log(`Sauvegarde de ${session.projet} → ${cible}`);

  const resume = {};
  let total = 0;
  for (const nom of COLLECTIONS) {
    // Séquentiel volontairement : une sauvegarde n'a pas à être rapide, et on
    // reste loin des quotas de lecture du plan gratuit.
    // eslint-disable-next-line no-await-in-loop
    // Documents bruts : une sauvegarde doit pouvoir être réécrite à
    // l'identique, sans passer par une conversion qui perdrait le type exact.
    const documents = await session.listerBrut(nom);
    const contenu = JSON.stringify({ collection: nom, exporteLe: new Date().toISOString(), documents }, null, 2);
    fs.writeFileSync(path.join(cible, `${nom}.json`), contenu, 'utf8');
    resume[nom] = documents.length;
    total += documents.length;
    console.log(`  ${nom} : ${documents.length} document(s)`);
  }

  fs.writeFileSync(
    path.join(cible, 'manifeste.json'),
    JSON.stringify({ projet: session.projet, exporteLe: new Date().toISOString(), collections: resume }, null, 2),
    'utf8'
  );

  // Une sauvegarde vide est un signal d'alarme, pas un succès : la session a
  // peut-être expiré, ou le projet n'est pas le bon.
  if (total === 0) {
    console.error('\n⚠️  Aucune donnée lue — sauvegarde vide. Vérifiez le projet et la session CLI.');
    process.exitCode = 1;
    return;
  }

  fairePlace();
  console.log(`\n✅ ${total} documents sauvegardés. ${sauvegardesExistantes().length} sauvegarde(s) conservée(s).`);
}

principal().catch((error) => {
  console.error('Échec de la sauvegarde :', error.message);
  process.exitCode = 1;
});
