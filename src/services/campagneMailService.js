// src/services/campagneMailService.js
//
// Configuration éditable de la « campagne desiderata » : le mail type envoyé à
// tous les médecins quand l'admin ouvre une nouvelle période de saisie, avec le
// modèle Excel des desiderata (et éventuellement l'ordre de choix) en pièce jointe.
//
// La config est un document unique config/campagne_mail (mêmes conventions que
// config/inscription), en lecture/écriture admin uniquement. Les MOIS concernés
// ne sont pas stockés : ils se déduisent de la période de saisie courante.
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import logger from '../utils/logger';

const CONFIG_COLLECTION = 'config';
const CAMPAGNE_DOC = 'campagne_mail';

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

// Valeurs par défaut calquées sur le courrier type de l'APUM. L'admin peut tout
// modifier depuis l'interface ; les champs vides sont simplement omis du mail.
export const CAMPAGNE_DEFAULTS = {
  objet: 'Désidérata et ordre de choix pour le prochain choix',
  nbVacationsMin: 4,
  dateRetour: '',
  dateReunion: '',
  lieuReunion: '',
  signataire: 'Dr Isabelle RONOT ZOVIGHIAN',
  fonction: "Présidente de l'APUM 13\nResponsable de la régulation médicale libérale",
  telephone: '0491386902'
};

export const getCampagneMail = async () => {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CAMPAGNE_DOC));
    return snap.exists() ? { ...CAMPAGNE_DEFAULTS, ...snap.data() } : { ...CAMPAGNE_DEFAULTS };
  } catch (error) {
    // Best-effort : en cas d'échec de lecture, on repart des valeurs par défaut.
    logger.error('Erreur lors de la lecture de la configuration de campagne:', error);
    return { ...CAMPAGNE_DEFAULTS };
  }
};

export const setCampagneMail = async (config) => {
  try {
    // On ne persiste que les clés connues (pas de champ parasite).
    const clean = {};
    Object.keys(CAMPAGNE_DEFAULTS).forEach((k) => {
      clean[k] = config?.[k] ?? CAMPAGNE_DEFAULTS[k];
    });
    await setDoc(doc(db, CONFIG_COLLECTION, CAMPAGNE_DOC), clean);
    logger.debug('Configuration de campagne mise à jour');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la configuration de campagne:', error);
    throw error;
  }
};

/**
 * Mois concernés, en clair, déduits de la période de saisie.
 * Ex. « août, septembre et octobre 2026 » ; ajoute l'année à chaque mois si la
 * période chevauche deux années (« décembre 2026 et janvier 2027 »).
 * @param {Object} periode - { startDate, endDate } (ISO string ou 'YYYY-MM-DD')
 * @returns {string}
 */
export const formatMoisConcernes = (periode) => {
  if (!periode?.startDate || !periode?.endDate) { return ''; }
  const start = new Date(periode.startDate);
  const end = new Date(periode.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { return ''; }

  const items = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    items.push({ mois: cur.getMonth(), annee: cur.getFullYear() });
    cur.setMonth(cur.getMonth() + 1);
  }
  if (items.length === 0) { return ''; }

  const multiAnnee = items.some((it) => it.annee !== items[0].annee);
  const libelles = items.map((it) => (multiAnnee ? `${MOIS[it.mois]} ${it.annee}` : MOIS[it.mois]));
  const anneeSuffix = multiAnnee ? '' : ` ${items[items.length - 1].annee}`;

  if (libelles.length === 1) { return `${libelles[0]}${anneeSuffix}`; }
  const debut = libelles.slice(0, -1).join(', ');
  return `${debut} et ${libelles[libelles.length - 1]}${anneeSuffix}`;
};

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Assemble le mail de campagne (sujet + texte + html) à partir de la config
 * éditée par l'admin et de la période de saisie (pour les mois concernés).
 * Le gabarit reprend le courrier type de l'APUM ; les champs vides sont omis.
 * @param {Object} config - config de campagne (voir CAMPAGNE_DEFAULTS)
 * @param {Object} periode - { startDate, endDate }
 * @returns {{ subject: string, text: string, html: string }}
 */
export const buildCampagneEmail = (config, periode) => {
  const c = { ...CAMPAGNE_DEFAULTS, ...(config || {}) };
  // Repli si le nombre de vacations a été laissé vide côté formulaire
  // (le spread au-dessus garantit déjà une valeur définie, reste le cas '').
  const nbVacations = c.nbVacationsMin === '' ? CAMPAGNE_DEFAULTS.nbVacationsMin : c.nbVacationsMin;
  const mois = formatMoisConcernes(periode);
  const moisPhrase = mois ? ` (${mois})` : '';

  const lignes = [];
  lignes.push('Chers Amis,');
  lignes.push('');
  lignes.push(`Voici les désidérata pour le prochain choix${moisPhrase}, ainsi que l'ordre de choix.`);
  lignes.push('');
  lignes.push(`Chaque régulateur doit se positionner pour ${nbVacations} vacations de 1h à 7h au minimum, afin de pouvoir remplir le tableau de garde des vacations de nuit.`);
  lignes.push('');
  if (c.dateRetour) {
    lignes.push(`Date de retour des tableaux avant le ${c.dateRetour}.`);
    lignes.push('');
  }
  lignes.push('Les gardes groupées ou non dans un même week-end');
  lignes.push('Les renforts associés ou non à une garde');
  lignes.push('Nombre de gardes souhaitées');
  lignes.push('');
  if (c.dateReunion) {
    const lieu = c.lieuReunion
      ? ` Le lieu : ${c.lieuReunion}.`
      : ' Le lieu vous sera communiqué ultérieurement.';
    lignes.push(`La réunion concernant ce choix se déroulera le ${c.dateReunion}.${lieu}`);
    lignes.push('');
  }
  lignes.push('Amicalement.');
  lignes.push('');
  if (c.signataire) { lignes.push(c.signataire); }
  if (c.fonction) { c.fonction.split('\n').forEach((l) => lignes.push(l)); }
  if (c.telephone) { lignes.push(c.telephone); }

  const text = lignes.join('\n');
  const html = lignes.map((l) => (l === '' ? '' : escapeHtml(l))).join('<br>');

  return { subject: c.objet, text, html };
};
