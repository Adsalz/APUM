// src/services/annuaireService.js
//
// Annuaire public de connexion des médecins.
//
// La page de login peuple une liste déroulante AVANT toute authentification :
// on ne peut donc pas lire la collection `users` (verrouillée par les règles).
// On maintient à la place une collection `annuaire/{uid}` en LECTURE PUBLIQUE,
// contenant le strict minimum : un `label` d'affichage minimisé (« Prénom N. »)
// et l'`email` de connexion (résolu en coulisse pour signInWithEmailAndPassword).
//
// Écriture réservée aux admins (règles Firestore). La source de vérité reste
// `users` : cet annuaire en est une projection reconstructible à volonté via
// syncAnnuaire().
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getMedecins } from './userService';
import logger from '../utils/logger';

const ANNUAIRE_COLLECTION = 'annuaire';
const BATCH_CHUNK = 450; // marge sous la limite Firestore de 500 opérations/batch

const capitalize = (s) => {
  const t = (s || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
};

// Construit un label pour un niveau de précision `k` du nom de famille :
//  k = 1        -> « Prénom D. »
//  1 < k < len  -> « Prénom Dup. »
//  k >= len     -> « Prénom Dupont » (nom complet, plus de point)
const labelWith = (prenom, nom, k) => {
  const p = (prenom || '').trim();
  const n = (nom || '').trim();
  if (!n) return p || '(sans nom)';
  if (k >= n.length) return `${p} ${capitalize(n)}`.trim();
  return `${p} ${capitalize(n.slice(0, k))}.`.trim();
};

// Calcule des labels UNIQUES pour l'ensemble des médecins.
//
// On part de « Prénom N. » et, tant que deux médecins partagent le même label,
// on élargit le préfixe du nom des seuls médecins en collision (« Prénom Dup. »,
// puis nom complet). En dernier recours (vrais homonymes prénom + nom
// identiques), on suffixe « (1) », « (2) »… Le label n'est qu'un repère humain :
// la clé de résolution reste l'uid (voir Login), donc même une égalité de label
// n'entraîne jamais de connexion vers le mauvais compte.
export function computeAnnuaireLabels(medecins) {
  const entries = medecins.map((m) => ({ id: m.id, prenom: m.prenom, nom: m.nom, k: 1 }));

  for (let iter = 0; iter < 30; iter += 1) {
    const counts = {};
    entries.forEach((e) => {
      const lbl = labelWith(e.prenom, e.nom, e.k);
      counts[lbl] = (counts[lbl] || 0) + 1;
    });

    let changed = false;
    entries.forEach((e) => {
      const lbl = labelWith(e.prenom, e.nom, e.k);
      const nomLen = (e.nom || '').trim().length;
      if (counts[lbl] > 1 && e.k < nomLen) {
        e.k += 1;
        changed = true;
      }
    });
    if (!changed) break;
  }

  const finals = entries.map((e) => ({ id: e.id, lbl: labelWith(e.prenom, e.nom, e.k) }));
  const groupCount = {};
  finals.forEach((f) => { groupCount[f.lbl] = (groupCount[f.lbl] || 0) + 1; });

  const seen = {};
  const result = {};
  finals.forEach((f) => {
    if (groupCount[f.lbl] > 1) {
      seen[f.lbl] = (seen[f.lbl] || 0) + 1;
      result[f.id] = `${f.lbl} (${seen[f.lbl]})`;
    } else {
      result[f.id] = f.lbl;
    }
  });
  return result;
}

// Lecture PUBLIQUE (non authentifiée) : alimente la liste déroulante de login.
// Renvoie [{ id, label, email }] trié alphabétiquement par label.
export const getAnnuaire = async () => {
  const snapshot = await getDocs(collection(db, ANNUAIRE_COLLECTION));
  const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) =>
    (a.label || '').localeCompare(b.label || '', 'fr', { sensitivity: 'base' })
  );
  return list;
};

// Reconstruit l'annuaire à partir de `users` (rôle médecin). Idempotent :
//  - (ré)écrit annuaire/{uid} = { label, email } pour chaque médecin ;
//  - RÉCONCILIE : supprime tout doc annuaire dont l'uid n'est plus médecin
//    (compte révoqué, promu admin, etc.).
// Réservé aux admins (règles Firestore). Réexécutable à volonté.
export const syncAnnuaire = async () => {
  const medecins = await getMedecins();
  const labels = computeAnnuaireLabels(medecins);
  const validIds = new Set(medecins.map((m) => m.id));

  const existingSnapshot = await getDocs(collection(db, ANNUAIRE_COLLECTION));

  const ops = [];
  medecins.forEach((m) => {
    if (!m.email) {
      // Un médecin sans email ne peut pas se connecter : on l'exclut de
      // l'annuaire plutôt que d'écrire une entrée qui casserait le login.
      logger.warn('Médecin sans email, exclu de l\'annuaire', { id: m.id });
      return;
    }
    ops.push({ type: 'set', id: m.id, data: { label: labels[m.id], email: m.email } });
  });
  existingSnapshot.forEach((d) => {
    if (!validIds.has(d.id)) {
      ops.push({ type: 'delete', id: d.id });
    }
  });

  for (let i = 0; i < ops.length; i += BATCH_CHUNK) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_CHUNK).forEach((op) => {
      const ref = doc(db, ANNUAIRE_COLLECTION, op.id);
      if (op.type === 'set') batch.set(ref, op.data);
      else batch.delete(ref);
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }

  const synced = ops.filter((o) => o.type === 'set').length;
  const removed = ops.filter((o) => o.type === 'delete').length;
  logger.debug('Annuaire synchronisé', { synced, removed });
  return { synced, removed };
};
