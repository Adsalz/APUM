// src/utils/brouillonDesiderata.js
// Brouillon local d'une fiche de desiderata.
//
// Remplir une fiche, c'est 90 jours × 6 créneaux. Jusqu'ici rien n'était
// conservé tant que le médecin n'avait pas cliqué sur « Enregistrer » : un
// onglet tué par le téléphone, une batterie vide, et tout était à refaire.
// On garde donc une copie locale à chaque changement, restaurée à la
// réouverture. Elle ne quitte JAMAIS l'appareil (pas de Firestore, pas de
// réseau) et disparaît dès que la fiche est enregistrée.
import { idPeriode } from './periodeId';
import logger from './logger';

const PREFIXE = 'apum.brouillon-desiderata';
const VERSION = 1;

// Au-delà, on ignore le brouillon : il vaut mieux repartir de la fiche
// enregistrée que ressusciter un travail oublié depuis des semaines.
const PEREMPTION_JOURS = 30;

export const cleBrouillon = (userId, periode) => {
  const periodeId = idPeriode(periode);
  if (!userId || !periodeId) { return null; }
  return `${PREFIXE}.${userId}.${periodeId}`;
};

// localStorage peut lever (navigation privée stricte, quota, stockage
// désactivé) : aucun accès ne doit jamais empêcher de remplir sa fiche.
const stockage = () => {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

export const ecrireBrouillon = (userId, periode, payload) => {
  const cle = cleBrouillon(userId, periode);
  const store = stockage();
  if (!cle || !store) { return false; }
  try {
    store.setItem(cle, JSON.stringify({ version: VERSION, enregistreLe: new Date().toISOString(), payload }));
    return true;
  } catch (error) {
    // Quota dépassé : on ne dérange pas le médecin, il perd seulement le filet.
    logger.error('Brouillon non sauvegardé:', error);
    return false;
  }
};

export const effacerBrouillon = (userId, periode) => {
  const cle = cleBrouillon(userId, periode);
  const store = stockage();
  if (!cle || !store) { return; }
  try {
    store.removeItem(cle);
  } catch (error) {
    logger.error('Brouillon non effacé:', error);
  }
};

const estPerime = (enregistreLe, maintenant) => {
  const date = new Date(enregistreLe);
  if (Number.isNaN(date.getTime())) { return true; }
  return (maintenant - date) > PEREMPTION_JOURS * 24 * 60 * 60 * 1000;
};

/** { payload, enregistreLe } ou null — brouillon absent, illisible ou périmé. */
export const lireBrouillon = (userId, periode, maintenant = Date.now()) => {
  const cle = cleBrouillon(userId, periode);
  const store = stockage();
  if (!cle || !store) { return null; }

  let brut;
  try {
    brut = store.getItem(cle);
  } catch (error) {
    return null;
  }
  if (!brut) { return null; }

  try {
    const donnees = JSON.parse(brut);
    if (donnees?.version !== VERSION || !donnees.payload) { return null; }
    if (estPerime(donnees.enregistreLe, maintenant)) {
      effacerBrouillon(userId, periode);
      return null;
    }
    return { payload: donnees.payload, enregistreLe: donnees.enregistreLe };
  } catch (error) {
    // Entrée corrompue : on s'en débarrasse plutôt que de buter dessus à chaque
    // ouverture de la page.
    effacerBrouillon(userId, periode);
    return null;
  }
};

// Compare un brouillon à la fiche enregistrée : inutile de proposer de
// restaurer quelque chose d'identique à ce qui est déjà affiché.
export const brouillonDiffere = (payload, fiche) => {
  if (!payload) { return false; }
  // La fiche enregistrée porte des nombres (buildPayload les convertit), le
  // brouillon des chaînes de formulaire : sans cette normalisation, 6 et « 6 »
  // passeraient pour une différence et le bandeau s'afficherait à tort.
  const normaliser = (source) => JSON.stringify({
    desiderata: source?.desiderata || {},
    nombreGardesSouhaitees: String(source?.nombreGardesSouhaitees || ''),
    nombreGardesMaxParSemaine: String(source?.nombreGardesMaxParSemaine || ''),
    gardesGroupees: Boolean(source?.gardesGroupees),
    renfortsAssocies: Boolean(source?.renfortsAssocies),
  });
  return normaliser(payload) !== normaliser(fiche);
};

// « le 4 octobre à 13:29 » — même forme que la date de modification des fiches.
export const libelleBrouillon = (enregistreLe) => {
  const date = new Date(enregistreLe);
  if (Number.isNaN(date.getTime())) { return ''; }
  const jour = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
    .replace(/^1 /, '1er ');
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  return `le ${jour} à ${heure}`;
};
