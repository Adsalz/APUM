// src/utils/planningEdition.js
// Couche PURE au service de l'ÉDITION MANUELLE du planning (aucun accès Firebase,
// aucun React). Trois rôles :
//   1. indexer les desiderata pour un accès O(1) (l'écran d'édition monte plus de
//      1 000 sélecteurs : un `Array.find()` par lecture est rédhibitoire) ;
//   2. analyser un planning (couverture, places vides, violations de contraintes) ;
//   3. évaluer un CANDIDAT pour une place donnée, afin que l'admin voie pourquoi
//      un médecin est déconseillé AVANT de l'affecter.
//
// Les règles reproduisent celles du moteur (src/utils/planningCore.js) : source
// unique des contraintes dures, pas de duplication de la logique métier.
import {
  creneaux,
  effectifPour,
  cleSemaineISO,
  aCreneauxChevauchants,
  creeraitTroisJoursConsecutifs,
  MAX_CRENEAUX_PAR_JOUR
} from './planningCore';

// ---------------------------------------------------------------------------
// 1. Index des desiderata
// ---------------------------------------------------------------------------

/**
 * Transforme le tableau de documents desiderata en Map indexée par userId.
 * À construire UNE fois par chargement (useMemo), pas à chaque rendu.
 */
export const indexerDesiderata = (desiderata = []) => {
  const index = new Map();
  desiderata.forEach((d) => {
    if (!d || !d.userId) { return; }
    const existant = index.get(d.userId);
    if (existant) {
      // Plusieurs fiches pour un même médecin : on fusionne les préférences.
      Object.entries(d.desiderata || {}).forEach(([date, jour]) => {
        existant.preferences[date] = { ...existant.preferences[date], ...jour };
      });
      return;
    }
    index.set(d.userId, {
      preferences: { ...(d.desiderata || {}) },
      souhaitMensuel: d.nombreGardesSouhaitees || 0,
      maxParSemaine: d.nombreGardesMaxParSemaine || 7
    });
  });
  return index;
};

export const preferencePour = (index, medecinId, date, creneauId) =>
  index?.get(medecinId)?.preferences?.[date]?.[creneauId] || '';

export const souhaitMensuelDe = (index, medecinId) =>
  index?.get(medecinId)?.souhaitMensuel || 0;

export const maxParSemaineDe = (index, medecinId) =>
  index?.get(medecinId)?.maxParSemaine || 7;

// ---------------------------------------------------------------------------
// 2. Analyse d'un planning
// ---------------------------------------------------------------------------

/** Clé stable d'une place : `date|creneau|index`. */
export const cleSlot = (date, creneauId, index) => `${date}|${creneauId}|${index}`;

/**
 * Parcours UNIQUE du planning produisant tous les compteurs dont l'écran a besoin.
 * Évite les O(n²) : sans ça, chaque contrôle « max/semaine » re-balaierait tout
 * le planning (~640 000 opérations pour une période de 3 mois).
 */
export const indexerPlanning = (planningDoc) => {
  const jours = planningDoc?.planning || {};
  const parMois = {};     // 'YYYY-MM' -> medecinId -> nb de gardes
  const parSemaine = {};  // clé ISO   -> medecinId -> nb de gardes
  const parJour = {};     // 'YYYY-MM-DD' -> medecinId -> nb de créneaux ce jour
  const placesVides = [];
  let places = 0;
  let pourvues = 0;

  Object.keys(jours).sort().forEach((date) => {
    const mois = date.slice(0, 7);
    const semaine = cleSemaineISO(date);
    parMois[mois] = parMois[mois] || {};
    parSemaine[semaine] = parSemaine[semaine] || {};
    parJour[date] = parJour[date] || {};

    Object.entries(jours[date] || {}).forEach(([creneauId, occupants]) => {
      (occupants || []).forEach((medecinId, index) => {
        places += 1;
        if (!medecinId) {
          placesVides.push({ date, creneauId, index });
          return;
        }
        pourvues += 1;
        parMois[mois][medecinId] = (parMois[mois][medecinId] || 0) + 1;
        parSemaine[semaine][medecinId] = (parSemaine[semaine][medecinId] || 0) + 1;
        parJour[date][medecinId] = (parJour[date][medecinId] || 0) + 1;
      });
    });
  });

  return { parMois, parSemaine, parJour, placesVides, places, pourvues };
};

export const gardesDuMois = (idxPlanning, date, medecinId) =>
  idxPlanning?.parMois?.[date.slice(0, 7)]?.[medecinId] || 0;

// Niveaux de gravité, du plus grave au plus léger.
export const NIVEAUX = { DUR: 'dur', FORT: 'fort', INFO: 'info' };

const PROBLEMES = {
  doublon: { niveau: NIVEAUX.DUR, libelle: 'Déjà sur ce créneau' },
  chevauchement: { niveau: NIVEAUX.DUR, libelle: 'Créneaux qui se chevauchent' },
  troisJours: { niveau: NIVEAUX.DUR, libelle: '3 jours de garde consécutifs' },
  maxSemaine: { niveau: NIVEAUX.DUR, libelle: 'Max/semaine dépassé' },
  indisponible: { niveau: NIVEAUX.FORT, libelle: 'A répondu « Non »' },
  nonRenseigne: { niveau: NIVEAUX.INFO, libelle: 'Pas de réponse' },
  // « atteint » (il est pile à son quota) et « dépassé » (il est au-delà) sont
  // deux situations distinctes : les confondre ferait lire « dépassé » à l'admin
  // pour un médecin qui respecte exactement son souhait.
  quotaAtteint: { niveau: NIVEAUX.FORT, libelle: 'Quota mensuel atteint' },
  quota: { niveau: NIVEAUX.FORT, libelle: 'Quota mensuel dépassé' },
  deuxCreneaux: { niveau: NIVEAUX.INFO, libelle: 'Déjà 2 créneaux ce jour' }
};

const probleme = (code, detail) => ({ code, ...PROBLEMES[code], detail });

/**
 * Problèmes posés par une affectation DÉJÀ EN PLACE (contrôle a posteriori,
 * utilisé pour signaler les violations sur la grille).
 */
export const problemesAffectation = (medecinId, date, creneauId, planningJours, idxPlanning, idxDesiderata) => {
  const out = [];
  if (!medecinId) { return out; }

  const occupants = planningJours?.[date]?.[creneauId] || [];
  if (occupants.filter((m) => m === medecinId).length > 1) {
    out.push(probleme('doublon'));
  }
  if (aCreneauxChevauchants(medecinId, date, creneauId, planningJours)) {
    out.push(probleme('chevauchement'));
  }
  if (creeraitTroisJoursConsecutifs(medecinId, date, planningJours)) {
    out.push(probleme('troisJours'));
  }

  const semaine = cleSemaineISO(date);
  const gardesSemaine = idxPlanning?.parSemaine?.[semaine]?.[medecinId] || 0;
  const maxSem = maxParSemaineDe(idxDesiderata, medecinId);
  if (gardesSemaine > maxSem) {
    out.push(probleme('maxSemaine', `${gardesSemaine}/${maxSem}`));
  }

  const pref = preferencePour(idxDesiderata, medecinId, date, creneauId);
  if (pref === 'Non') { out.push(probleme('indisponible')); }
  else if (!pref) { out.push(probleme('nonRenseigne')); }

  const souhait = souhaitMensuelDe(idxDesiderata, medecinId);
  const dejaCeMois = gardesDuMois(idxPlanning, date, medecinId);
  if (souhait && dejaCeMois > souhait) {
    out.push(probleme('quota', `${dejaCeMois}/${souhait}`));
  }

  return out;
};

/**
 * Problèmes que CRÉERAIT l'affectation d'un candidat à une place encore libre
 * (ou occupée par quelqu'un d'autre). Utilisé par le sélecteur de médecin.
 */
export const problemesCandidat = (medecinId, date, creneauId, planningJours, idxPlanning, idxDesiderata) => {
  const out = [];
  if (!medecinId) { return out; }

  const occupants = planningJours?.[date]?.[creneauId] || [];
  if (occupants.includes(medecinId)) { out.push(probleme('doublon')); }
  if (aCreneauxChevauchants(medecinId, date, creneauId, planningJours)) {
    out.push(probleme('chevauchement'));
  }
  if (creeraitTroisJoursConsecutifs(medecinId, date, planningJours)) {
    out.push(probleme('troisJours'));
  }

  const semaine = cleSemaineISO(date);
  const gardesSemaine = idxPlanning?.parSemaine?.[semaine]?.[medecinId] || 0;
  const maxSem = maxParSemaineDe(idxDesiderata, medecinId);
  if (gardesSemaine + 1 > maxSem) {
    out.push(probleme('maxSemaine', `${gardesSemaine}/${maxSem}`));
  }

  const pref = preferencePour(idxDesiderata, medecinId, date, creneauId);
  if (pref === 'Non') { out.push(probleme('indisponible')); }
  else if (!pref) { out.push(probleme('nonRenseigne')); }

  const souhait = souhaitMensuelDe(idxDesiderata, medecinId);
  const dejaCeMois = gardesDuMois(idxPlanning, date, medecinId);
  if (souhait && dejaCeMois >= souhait) {
    out.push(probleme(
      dejaCeMois > souhait ? 'quota' : 'quotaAtteint',
      `${dejaCeMois}/${souhait}`
    ));
  }

  const creneauxCeJour = idxPlanning?.parJour?.[date]?.[medecinId] || 0;
  if (creneauxCeJour >= MAX_CRENEAUX_PAR_JOUR) { out.push(probleme('deuxCreneaux')); }

  return out;
};

/** Niveau de gravité le plus élevé d'une liste de problèmes ('' si aucun). */
export const pireNiveau = (problemes = []) => {
  if (problemes.some((p) => p.niveau === NIVEAUX.DUR)) { return NIVEAUX.DUR; }
  if (problemes.some((p) => p.niveau === NIVEAUX.FORT)) { return NIVEAUX.FORT; }
  if (problemes.length > 0) { return NIVEAUX.INFO; }
  return '';
};

/**
 * Analyse complète d'un planning : couverture + violations, prête à afficher.
 * `problemesParSlot` ne contient QUE les places posant au moins un problème
 * de niveau « dur » ou « fort » (le bruit « info » resterait sans action).
 */
export const analyserPlanning = (planningDoc, idxDesiderata) => {
  const jours = planningDoc?.planning || {};
  const idxPlanning = indexerPlanning(planningDoc);
  const problemesParSlot = new Map();
  let violationsDures = 0;
  let violationsFortes = 0;

  Object.entries(jours).forEach(([date, creneauxDuJour]) => {
    Object.entries(creneauxDuJour || {}).forEach(([creneauId, occupants]) => {
      (occupants || []).forEach((medecinId, index) => {
        if (!medecinId) { return; }
        const pbs = problemesAffectation(medecinId, date, creneauId, jours, idxPlanning, idxDesiderata)
          .filter((p) => p.niveau !== NIVEAUX.INFO);
        if (pbs.length === 0) { return; }
        problemesParSlot.set(cleSlot(date, creneauId, index), pbs);
        if (pbs.some((p) => p.niveau === NIVEAUX.DUR)) { violationsDures += 1; }
        else { violationsFortes += 1; }
      });
    });
  });

  return {
    ...idxPlanning,
    vides: idxPlanning.places - idxPlanning.pourvues,
    tauxCouverture: idxPlanning.places ? idxPlanning.pourvues / idxPlanning.places : 1,
    problemesParSlot,
    violationsDures,
    violationsFortes
  };
};

/**
 * Dates comportant au moins une place vide (pour le filtre « à compléter »).
 */
export const datesIncompletes = (planningDoc) => {
  const jours = planningDoc?.planning || {};
  const out = new Set();
  Object.entries(jours).forEach(([date, creneauxDuJour]) => {
    Object.values(creneauxDuJour || {}).forEach((occupants) => {
      if ((occupants || []).some((m) => !m)) { out.add(date); }
    });
  });
  return out;
};

/**
 * Places d'un jour manquantes par rapport à l'effectif cible du type de jour —
 * utile quand le planning stocké est plus court que l'effectif attendu.
 */
export const placesAttenduesJour = (date) =>
  creneaux.reduce((n, c) => n + effectifPour(c.id, date), 0);

// ---------------------------------------------------------------------------
// 4. État d'édition (réducteur PUR)
// ---------------------------------------------------------------------------
// `reference` = état du planning au dernier point stable (entrée en édition ou
// dernière sauvegarde) ; `historique` = pile des états précédents (annulation).
//
// Toutes les transitions sont IMMUTABLES. C'est ce qui permet à « Abandonner les
// changements » de restaurer réellement : l'implémentation précédente faisait une
// copie SUPERFICIELLE (`{ ...prev }`) puis mutait `prev.planning` en place, si
// bien qu'aucune version antérieure n'existait — abandonner n'abandonnait rien et
// l'écran divergeait silencieusement de Firestore.
export const PROFONDEUR_HISTORIQUE = 50;

export const etatEditionInitial = { planning: null, reference: null, historique: [] };

export const reducerEdition = (etat, action) => {
  switch (action.type) {
  case 'charger':
  case 'remplacer':
    return { planning: action.planning, reference: action.planning, historique: [] };

  case 'pointStable': // entrée en édition, ou sauvegarde réussie
    return { ...etat, reference: etat.planning, historique: [] };

  case 'affecter': {
    const { date, creneau, index, medecinId } = action;
    const prev = etat.planning;
    if (!prev) { return etat; }
    const jours = prev.planning || {};
    const jour = jours[date] || {};
    const places = jour[creneau]
      ? [...jour[creneau]]
      : Array(effectifPour(creneau, date)).fill(null);
    const valeur = medecinId || null;
    if (places[index] === valeur) { return etat; }
    places[index] = valeur;
    return {
      ...etat,
      planning: { ...prev, planning: { ...jours, [date]: { ...jour, [creneau]: places } } },
      historique: [...etat.historique.slice(-(PROFONDEUR_HISTORIQUE - 1)), prev]
    };
  }

  case 'annulerAction': {
    if (etat.historique.length === 0) { return etat; }
    return {
      ...etat,
      planning: etat.historique[etat.historique.length - 1],
      historique: etat.historique.slice(0, -1)
    };
  }

  case 'abandonner':
    return { ...etat, planning: etat.reference ?? etat.planning, historique: [] };

  default:
    return etat;
  }
};
