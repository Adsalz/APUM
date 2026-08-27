// scripts/lib/session-cli.js
//
// Accès Firestore + Firebase Auth via la SESSION DU CLI FIREBASE, sans clé de
// compte de service. Même principe que basculer-periode-saisie.js : le jeton de
// rafraîchissement déposé par `npx firebase-tools login` est échangé contre un
// jeton d'accès, utilisé en Bearer sur les API REST.
//
// Pourquoi cette voie plutôt que le SDK Admin : le SDK Admin exige une clé de
// compte de service (ou des identifiants de service). Des identifiants
// UTILISATEUR (ADC `gcloud`) sont refusés par l'API Admin Auth, alors que le
// jeton du CLI, lui, porte les droits du propriétaire du projet.

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_CLI = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
// Identifiants publics du client OAuth de firebase-tools (mêmes que
// basculer-periode-saisie.js).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function projetParDefaut() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.firebaserc'), 'utf8')).projects.default;
  } catch {
    return null;
  }
}

async function jeton() {
  if (!fs.existsSync(CONFIG_CLI)) throw new Error('Session CLI absente — lance `npx firebase-tools login`.');
  const { tokens } = JSON.parse(fs.readFileSync(CONFIG_CLI, 'utf8'));
  if (!tokens || !tokens.refresh_token) throw new Error('Session CLI incomplète — relance `npx firebase-tools login`.');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error(`Authentification refusée (${r.status}) — relance \`npx firebase-tools login\`.`);
  return (await r.json()).access_token;
}

// ── Encodage/décodage des valeurs Firestore REST ─────────────────────────────
const versValeur = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(versValeur) } };
  return { stringValue: String(v) };
};

const versChamps = (obj) => {
  const fields = {};
  Object.entries(obj).forEach(([k, v]) => { fields[k] = versValeur(v); });
  return fields;
};

const depuisValeur = (v) => {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(depuisValeur);
  return v;
};

const depuisChamps = (fields) => {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => { out[k] = depuisValeur(v); });
  return out;
};

async function creerSession({ projet } = {}) {
  const p = projet || projetParDefaut();
  if (!p) throw new Error('Projet Firebase introuvable — précisez --projet <id> (ou vérifiez .firebaserc).');
  const token = await jeton();
  const entetes = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const baseFs = `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
  const baseAuth = `https://identitytoolkit.googleapis.com/v1/projects/${p}`;

  const postAuth = async (chemin, corps) => {
    const r = await fetch(`${baseAuth}${chemin}`, {
      method: 'POST', headers: entetes, body: JSON.stringify(corps),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || `${r.status}`;
      const err = new Error(msg);
      err.emailExiste = String(msg).startsWith('EMAIL_EXISTS');
      throw err;
    }
    return data;
  };

  return {
    projet: p,

    // ── Firestore ────────────────────────────────────────────────────────────
    async lister(collection) {
      const out = [];
      let pageToken;
      do {
        const url = `${baseFs}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        // eslint-disable-next-line no-await-in-loop
        const r = await fetch(url, { headers: entetes });
        if (!r.ok) throw new Error(`LIST ${collection} → ${r.status} ${await r.text()}`);
        // eslint-disable-next-line no-await-in-loop
        const page = await r.json();
        (page.documents || []).forEach((d) =>
          out.push({ id: d.name.split('/').pop(), ...depuisChamps(d.fields) })
        );
        pageToken = page.nextPageToken;
      } while (pageToken);
      return out;
    },

    async get(chemin) {
      const r = await fetch(`${baseFs}/${chemin}`, { headers: entetes });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GET ${chemin} → ${r.status} ${await r.text()}`);
      const d = await r.json();
      return depuisChamps(d.fields);
    },

    // Écrit le document ENTIER (champs absents = supprimés) — équivalent d'un set().
    async ecrire(chemin, donnees) {
      const r = await fetch(`${baseFs}/${chemin}`, {
        method: 'PATCH', headers: entetes, body: JSON.stringify({ fields: versChamps(donnees) }),
      });
      if (!r.ok) throw new Error(`SET ${chemin} → ${r.status} ${await r.text()}`);
      return r.json();
    },

    // Ne touche QUE les champs fournis — équivalent d'un update().
    async majChamps(chemin, donnees) {
      const masque = Object.keys(donnees).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      const r = await fetch(`${baseFs}/${chemin}?${masque}`, {
        method: 'PATCH', headers: entetes, body: JSON.stringify({ fields: versChamps(donnees) }),
      });
      if (!r.ok) throw new Error(`UPDATE ${chemin} → ${r.status} ${await r.text()}`);
      return r.json();
    },

    // ── Firebase Auth (Identity Toolkit, portée projet) ──────────────────────
    async chercherParEmail(email) {
      const d = await postAuth('/accounts:lookup', { email: [email] });
      return (d.users && d.users[0]) ? d.users[0].localId : null;
    },

    async creerCompte(email, motDePasse) {
      const d = await postAuth('/accounts', { email, password: motDePasse });
      return d.localId;
    },

    async majEmail(localId, email) {
      await postAuth('/accounts:update', { localId, email });
    },

    // Fixe le mot de passe d'un compte existant (le code à 6 chiffres du
    // médecin, ou le code partagé qui rend le compte « à définir »). L'ancien
    // mot de passe n'est pas requis : le jeton du CLI porte les droits du
    // propriétaire du projet.
    async majMotDePasse(localId, motDePasse) {
      await postAuth('/accounts:update', { localId, password: motDePasse });
    },
  };
}

module.exports = { creerSession, projetParDefaut };
