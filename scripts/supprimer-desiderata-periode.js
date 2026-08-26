// scripts/supprimer-desiderata-periode.js
//
// Supprime DÉFINITIVEMENT les desiderata d'une période donnée. Sert à retirer un
// jeu de test ou une période abandonnée avant de rouvrir la saisie sur les mêmes
// dates — sinon les anciennes fiches ressortent dans getDesiderataForPeriod() et
// polluent le planning généré.
//
// ⚠️ IRRÉVERSIBLE côté Firestore. Une sauvegarde JSON complète des documents
// supprimés est écrite AVANT toute suppression, y compris en mode aperçu, et le
// script sait la rejouer (--restaurer).
//
// Ne touche PAS à planning/periode_saisie : pour changer la période affichée,
// voir basculer-periode-saisie.js.
//
// ── Authentification ────────────────────────────────────────────────────────
// Réutilise la session du CLI Firebase — aucune clé de compte de service.
//   npx firebase-tools login        (une fois, si besoin)
//
// ── Utilisation ─────────────────────────────────────────────────────────────
//   node supprimer-desiderata-periode.js 2026-11-01 2027-01-31        # aperçu
//   node supprimer-desiderata-periode.js 2026-11-01 2027-01-31 --go   # suppression
//   node supprimer-desiderata-periode.js --restaurer ~/apum-supprimes-....json --go
//
// Les bornes désignent les documents dont startDate ET endDate tombent EXACTEMENT
// sur ces dates (la période de saisie est identique pour toutes les fiches d'un
// même trimestre). Un document à cheval n'est jamais touché.
//
// Options :
//   --go                    exécute réellement (sans lui : simple aperçu)
//   --projet <id>           projet Firebase (défaut : lu dans .firebaserc)
//   --sauvegarde <fichier>  chemin de la sauvegarde (défaut : ~/apum-supprimes-<horodatage>.json)
//   --restaurer <fichier>   réécrit les documents d'une sauvegarde

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_CLI = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const COLLECTION = 'desiderata';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const valeur = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const nommees = ['--projet', '--sauvegarde', '--restaurer'];
const positionnels = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && nommees.includes(argv[i - 1])));

const GO = flag('--go');
const RESTAURER = valeur('--restaurer', null);
const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const FICHIER = valeur('--sauvegarde', path.join(os.homedir(), `apum-supprimes-${horodatage}.json`));

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
    async supprimer(id) {
      const r = await fetch(`${base}/${COLLECTION}/${id}`, { method: 'DELETE', headers: entetes });
      if (!r.ok) throw new Error(`DELETE ${id} → ${r.status} ${await r.text()}`);
    },
    async ecrire(id, fields) {
      const r = await fetch(`${base}/${COLLECTION}/${id}`, {
        method: 'PATCH', headers: entetes, body: JSON.stringify({ fields }),
      });
      if (!r.ok) throw new Error(`PATCH ${id} → ${r.status} ${await r.text()}`);
    },
  };
};

const jourDe = (champ) => (champ && champ.timestampValue ? champ.timestampValue.slice(0, 10) : null);

// Les utilisateurs servent uniquement à rendre le rapport lisible (nom du médecin).
async function nomsMedecins(api) {
  const out = {};
  try {
    for (const d of await api.lister('users')) {
      const f = d.fields || {};
      out[d.name.split('/').pop()] = `${f.nom?.stringValue || ''} ${f.prenom?.stringValue || ''}`.trim();
    }
  } catch { /* rapport dégradé : on affichera les identifiants bruts */ }
  return out;
}

(async () => {
  try {
    if (!PROJET) throw new Error('Projet Firebase inconnu (ni --projet ni .firebaserc).');
    const api = creerApi(await jeton());

    if (RESTAURER) {
      const dump = JSON.parse(fs.readFileSync(RESTAURER, 'utf8'));
      console.log(`Sauvegarde du ${dump.genere} — projet ${dump.projet}`);
      console.log(`Documents à réécrire : ${dump.documents.length} (${dump.periode.debut} → ${dump.periode.fin})`);
      if (!GO) { console.log('\nAperçu seul. Relance avec --go pour appliquer.'); return; }
      for (const d of dump.documents) { await api.ecrire(d.id, d.fields); }
      console.log(`\n✓ ${dump.documents.length} documents réécrits.`);
      return;
    }

    const [debut, fin] = positionnels;
    if (!estDate(debut) || !estDate(fin)) throw new Error('Dates attendues au format AAAA-MM-JJ (début puis fin).');

    const tous = await api.lister(COLLECTION);
    const cibles = tous.filter((d) => {
      const f = d.fields || {};
      return jourDe(f.startDate) === debut && jourDe(f.endDate) === fin;
    });
    const noms = await nomsMedecins(api);

    console.log(`\nProjet : ${PROJET}`);
    console.log(`Période visée : ${debut} → ${fin}`);
    console.log(`\nDesiderata en base : ${tous.length}`);
    console.log(`À SUPPRIMER : ${cibles.length}`);
    console.log(`Conservés : ${tous.length - cibles.length}`);

    if (cibles.length === 0) { console.log('\nRien à supprimer.'); return; }

    const liste = cibles
      .map((d) => noms[d.fields?.userId?.stringValue] || `(compte ${d.fields?.userId?.stringValue || '?'})`)
      .sort();
    console.log(`\nMédecins concernés :\n  ${liste.join(', ')}`);

    fs.writeFileSync(FICHIER, JSON.stringify({
      genere: new Date().toISOString(), projet: PROJET,
      periode: { debut, fin },
      documents: cibles.map((d) => ({ id: d.name.split('/').pop(), fields: d.fields })),
    }, null, 1));
    console.log(`\nSauvegarde : ${FICHIER}`);

    if (!GO) { console.log('\nAperçu seul — RIEN supprimé. Relance avec --go pour appliquer.'); return; }

    for (const d of cibles) { await api.supprimer(d.name.split('/').pop()); }
    console.log(`\n✓ ${cibles.length} desiderata supprimés.`);
    console.log('\nEn cas d\'erreur, pour les réécrire :');
    console.log(`  node supprimer-desiderata-periode.js --restaurer "${FICHIER}" --go`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
})();
