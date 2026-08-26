// scripts/basculer-periode-saisie.js
//
// Change la PÉRIODE DE SAISIE affichée dans l'application, SANS supprimer les
// desiderata des autres périodes. Sert à remettre en ligne une période passée
// pour la consulter ou la comparer.
//
// ── POURQUOI UN SCRIPT ET PAS LE BOUTON DE L'APPLICATION ────────────────────
// Dans l'interface, définir la période appelle setPeriodeSaisie()
// (src/services/planningService.js), qui enchaîne sur deleteObsoleteDesiderata() :
// TOUT desiderata entièrement hors de la nouvelle période est SUPPRIMÉ. Revenir
// sur une période passée depuis l'app effacerait donc les saisies en cours.
//
// Ce script écrit planning/periode_saisie seul. Les jeux cohabitent en base ;
// l'app n'affiche que ceux qui CHEVAUCHENT la période (getDesiderataForPeriod).
//
// ⚠️ Pendant la bascule, un médecin qui se connecte voit le formulaire de la
// période affichée, pas celui de la période en cours. À rebasculer après usage.
//
// ── Authentification ────────────────────────────────────────────────────────
// Réutilise la session du CLI Firebase — aucune clé de compte de service.
//   npx firebase-tools login        (une fois, si besoin)
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node basculer-periode-saisie.js                          # état actuel, n'écrit rien
//   node basculer-periode-saisie.js 2026-08-01 2026-10-31 --go
//   node basculer-periode-saisie.js --restaurer ~/apum-periode-....json --go
//
// Options :
//   --go                    exécute réellement (sans lui : simple aperçu)
//   --projet <id>           projet Firebase (défaut : lu dans .firebaserc)
//   --sauvegarde <fichier>  chemin de la sauvegarde (défaut : ~/apum-periode-<horodatage>.json)
//   --restaurer <fichier>   rétablit la période enregistrée dans cette sauvegarde

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_CLI = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const valeur = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const positionnels = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--projet', '--sauvegarde', '--restaurer'].includes(argv[i - 1])));

const GO = flag('--go');
const RESTAURER = valeur('--restaurer', null);
const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const FICHIER = valeur('--sauvegarde', path.join(os.homedir(), `apum-periode-${horodatage}.json`));

const projetParDefaut = () => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8')).projects.default; }
  catch { return null; }
};
const PROJET = valeur('--projet', projetParDefaut());

const estDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

async function jeton() {
  if (!fs.existsSync(CONFIG_CLI)) throw new Error('Session CLI absente — lance `npx firebase-tools login`.');
  const { tokens } = JSON.parse(fs.readFileSync(CONFIG_CLI, 'utf8'));
  if (!tokens || !tokens.refresh_token) throw new Error('Session CLI incomplète — relance `npx firebase-tools login`.');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token, grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error(`Authentification refusée (${r.status}) — relance \`npx firebase-tools login\`.`);
  return (await r.json()).access_token;
}

const creerApi = (token) => {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
  const entetes = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  return {
    async get(chemin) {
      const r = await fetch(`${base}/${chemin}`, { headers: entetes });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GET ${chemin} → ${r.status} ${await r.text()}`);
      return r.json();
    },
    async lister(collection) {
      const out = []; let pageToken;
      do {
        const url = `${base}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const r = await fetch(url, { headers: entetes });
        if (!r.ok) throw new Error(`LIST ${collection} → ${r.status} ${await r.text()}`);
        const p = await r.json();
        out.push(...(p.documents || []));
        pageToken = p.nextPageToken;
      } while (pageToken);
      return out;
    },
    async ecrire(chemin, fields) {
      const r = await fetch(`${base}/${chemin}`, { method: 'PATCH', headers: entetes, body: JSON.stringify({ fields }) });
      if (!r.ok) throw new Error(`PATCH ${chemin} → ${r.status} ${await r.text()}`);
      return r.json();
    },
  };
};

const ts = (jour) => ({ timestampValue: `${jour}T00:00:00Z` });
const jourDe = (champ) => (champ && champ.timestampValue ? champ.timestampValue.slice(0, 10) : null);

async function etat(api) {
  const periode = await api.get('planning/periode_saisie');
  const docs = await api.lister('desiderata');
  const parPeriode = {};
  docs.forEach((d) => {
    const f = d.fields || {};
    const cle = `${jourDe(f.startDate) || '?'} → ${jourDe(f.endDate) || '?'}`;
    parPeriode[cle] = (parPeriode[cle] || 0) + 1;
  });
  return { periode, docs, parPeriode };
}

function afficherEtat({ periode, docs, parPeriode }, debut, fin) {
  const actuelle = periode
    ? `${jourDe(periode.fields.startDate)} → ${jourDe(periode.fields.endDate)}`
    : '(aucune)';
  console.log(`\nProjet : ${PROJET}`);
  console.log(`Période de saisie actuelle : ${actuelle}`);
  console.log(`\nDesiderata en base : ${docs.length}`);
  Object.entries(parPeriode).sort().forEach(([k, v]) => {
    const cible = debut && k === `${debut} → ${fin}` ? '   ← sera affichée' : '';
    console.log(`  ${k} : ${v} fiches${cible}`);
  });
  return actuelle;
}

(async () => {
  try {
    if (!PROJET) throw new Error('Projet Firebase inconnu (ni --projet ni .firebaserc).');
    const api = creerApi(await jeton());

    if (RESTAURER) {
      const dump = JSON.parse(fs.readFileSync(RESTAURER, 'utf8'));
      if (!dump.periodeSaisie) throw new Error('Cette sauvegarde ne contient aucune période.');
      const { debut, fin } = dump.periodeSaisie;
      const e = await etat(api);
      afficherEtat(e);
      console.log(`\nPériode à rétablir : ${debut} → ${fin}`);
      if (!GO) { console.log('\nAperçu seul. Relance avec --go pour appliquer.'); return; }
      await api.ecrire('planning/periode_saisie', { startDate: ts(debut), endDate: ts(fin) });
      console.log('\n✓ Période rétablie.');
      return;
    }

    const [debut, fin] = positionnels;
    const e = await etat(api);

    if (!debut && !fin) { afficherEtat(e); console.log('\nAucune date fournie — état seul, rien écrit.'); return; }
    if (!estDate(debut) || !estDate(fin)) throw new Error('Dates attendues au format AAAA-MM-JJ (début puis fin).');
    if (debut > fin) throw new Error('La date de début doit précéder la date de fin.');

    const actuelle = afficherEtat(e, debut, fin);
    const cible = e.parPeriode[`${debut} → ${fin}`] || 0;
    console.log(`\nNouvelle période de saisie : ${debut} → ${fin} (${cible} fiches)`);
    if (cible === 0) console.log('⚠ Aucune fiche sur cette période : l\'écran sera vide.');

    // Sauvegarde : la période actuelle ET l'inventaire, avant toute écriture.
    fs.writeFileSync(FICHIER, JSON.stringify({
      genere: new Date().toISOString(), projet: PROJET,
      periodeSaisie: e.periode
        ? { debut: jourDe(e.periode.fields.startDate), fin: jourDe(e.periode.fields.endDate) }
        : null,
      inventaire: e.parPeriode,
      desiderata: e.docs.map((d) => ({ id: d.name.split('/').pop(), fields: d.fields })),
    }, null, 1));
    console.log(`Sauvegarde : ${FICHIER}`);

    if (!GO) { console.log('\nAperçu seul — RIEN écrit en base. Relance avec --go pour appliquer.'); return; }

    await api.ecrire('planning/periode_saisie', { startDate: ts(debut), endDate: ts(fin) });
    console.log(`\n✓ Période de saisie : ${actuelle} → ${debut} → ${fin}`);
    console.log('✓ Aucun desiderata supprimé.');
    console.log('\nPour rebasculer :');
    console.log(`  node basculer-periode-saisie.js --restaurer "${FICHIER}" --go`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
})();
