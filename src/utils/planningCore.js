// src/utils/planningCore.js
// Cœur de calcul PUR de la génération de planning — AUCUN accès Firebase, afin
// de pouvoir s'exécuter dans un Web Worker (et être testé sans mock lourd).
// Regroupe les fonctions auparavant dupliquées dans planningGenerator.js et
// planningGeneratorPriorite.js (source unique). La couche I/O (récupération des
// desiderata/médecins) reste dans ces deux fichiers.
import logger from './logger';
import { estJourFerie } from './joursFeries';

// ORDRE CANONIQUE (demande admin, aligné sur la fiche desiderata papier) : le
// RENFORT 20h/00h vient APRÈS le 4ème quart. Cet ordre pilote l'affichage
// (écran d'édition) et sert de départage stable dans la passe de remplissage —
// aucune logique métier ne dépend de la position d'un créneau.
export const creneaux = [
  { id: 'QUART_1', label: '1er QUART (1h - 7h)', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART (7h - 13h)', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT 10h / 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART (13h - 19h)', medecins: 3 },
  { id: 'QUART_4', label: '4ème QUART (19h - 1h)', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT 20H / 00H', medecins: 1 }
];

// Plafond de créneaux (gardes) qu'un même médecin peut cumuler le MÊME jour.
// Calibré sur la feuille de référence APUM (« TABLEAUX MOIS PAR MOIS ») : le manuel
// empile jusqu'à 2 créneaux/jour mais JAMAIS 3 (0 cas sur 854 affectations réelles).
// Sans ce plafond, la passe principale produisait des enchaînements de 3 créneaux =
// jusqu'à 18h continues (ex. QUART_2+QUART_3+QUART_4 = 7h→1h). Les passes fallback et
// largeur imposent déjà « 1/jour » ; ce plafond rend la passe principale cohérente.
export const MAX_CRENEAUX_PAR_JOUR = 2;

// Effectifs cibles par TYPE DE JOUR, déduits de la feuille de garde de référence
// APUM (« TABLEAUX MOIS PAR MOIS »). Un JOUR FÉRIÉ compte comme un DIMANCHE
// (vérifié sur la référence : le 15/08, pourtant un samedi, n'a pas de renfort
// 10h/13h et suit les effectifs d'un dimanche).
// 0 = le créneau n'existe pas ce jour-là (ex. renfort 10h/13h hors samedi).
// NB : le SOUS-EFFECTIF d'AOÛT (congés d'été) est un facteur SAISONNIER, PAS une
// règle de type de jour → ne PAS l'encoder ici. Il émerge naturellement des
// desiderata (médecins indisponibles en août laissant des créneaux non pourvus).
// Pour ajuster le nombre de médecins par garde, modifier UNIQUEMENT ce tableau.
// Validé (2026-07) sur 7 mois NORMAUX (oct 2025→avr 2026), remplis à 98-99 % dans
// les feuilles de référence : les effectifs collent au staffing réel. Seule
// correction issue de cette validation : QUART_4 le SAMEDI passé de 2 à 3 (la
// réalité staffe constamment 3 régulateurs le samedi soir). Le déficit d'ASO26
// (854 staffés / 1145 ouverts) est bien l'effet saisonnier d'AOÛT, pas une table trop haute.
const EFFECTIFS_PAR_TYPE_JOUR = {
  //             semaine     samedi      dimanche (= férié)
  QUART_1:   { semaine: 2, samedi: 2, dimanche: 2 },
  QUART_2:   { semaine: 3, samedi: 3, dimanche: 4 },
  RENFORT_1: { semaine: 0, samedi: 1, dimanche: 0 },
  QUART_3:   { semaine: 3, samedi: 4, dimanche: 4 },
  QUART_4:   { semaine: 3, samedi: 3, dimanche: 3 },
  RENFORT_2: { semaine: 1, samedi: 1, dimanche: 1 },
};

// Type de jour pour les effectifs : 'samedi' | 'dimanche' | 'semaine'.
// Les jours fériés sont assimilés aux dimanches.
export const typeDeJour = (dateString) => {
  if (estJourFerie(dateString)) {
    return 'dimanche';
  }
  // getUTCDay pour rester cohérent avec les clés de date (toISOString = UTC).
  const jour = new Date(dateString).getUTCDay();
  if (jour === 6) { return 'samedi'; }
  if (jour === 0) { return 'dimanche'; }
  return 'semaine';
};

// Nombre de médecins à affecter pour un créneau à une date donnée
// (0 → le créneau n'est pas ouvert ce jour-là).
export const effectifPour = (creneauId, dateString) => {
  const parType = EFFECTIFS_PAR_TYPE_JOUR[creneauId];
  return parType ? (parType[typeDeJour(dateString)] || 0) : 0;
};

const creneauxChevauchants = {
  'QUART_2': ['RENFORT_1'],
  'RENFORT_1': ['QUART_2'],
  'QUART_4': ['RENFORT_2'],
  'RENFORT_2': ['QUART_4']
};

export const aCreneauxChevauchants = (medecinId, date, creneauId, planning) => {
  if (!creneauxChevauchants[creneauId]) { return false; }

  const creneauxDuJour = planning[date];
  return creneauxChevauchants[creneauId].some(creneauChevauchant =>
    creneauxDuJour[creneauChevauchant]?.includes(medecinId)
  );
};

// Numéro de semaine ISO-8601, calculé entièrement en UTC pour être insensible
// au fuseau et au passage heure d'été↔hiver (cohérent avec les clés de date
// 'YYYY-MM-DD' du planning).
export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Clé de semaine NON AMBIGUË : numéro ISO préfixé de l'année ISO (le lundi de la
// semaine). `getWeekNumber` seul recollerait la semaine 1 de deux années
// différentes — sans effet sur une période de 3 mois, mais faux dès qu'un
// planning couvre plus d'un an. Utilisée par le comptage hebdomadaire et par
// l'écran d'édition, pour que l'UI et le moteur comptent à l'identique.
export const cleSemaineISO = (dateString) => {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // jeudi de la semaine ISO
  return `${d.getUTCFullYear()}-S${getWeekNumber(dateString)}`;
};

export const compterGardesParSemaine = (medecinId, date, planning) => {
  const semaine = cleSemaineISO(date);
  let count = 0;

  Object.entries(planning).forEach(([planningDate, creneauxDuJour]) => {
    if (cleSemaineISO(planningDate) === semaine) {
      Object.values(creneauxDuJour).forEach(medecins => {
        if (medecins && medecins.includes(medecinId)) {
          count++;
        }
      });
    }
  });

  return count;
};

// Transforme le tableau brut de documents desiderata (Firestore) en une map
// indexée par userId, avec préférences par date normalisées.
export const buildDesiderataMap = (desiderataData) => {
  const desiderata = {};
  desiderataData.forEach(d => {
    if (!desiderata[d.userId]) {
      desiderata[d.userId] = {
        preferences: {},
        nombreGardesSouhaitees: d.nombreGardesSouhaitees,
        nombreGardesMaxParSemaine: d.nombreGardesMaxParSemaine || 7,
        gardesGroupees: d.gardesGroupees,
        renfortsAssocies: d.renfortsAssocies
      };
    }
    Object.entries(d.desiderata).forEach(([date, creneauxJour]) => {
      const formattedDate = new Date(date).toISOString().split('T')[0];
      if (!desiderata[d.userId].preferences[formattedDate]) {
        desiderata[d.userId].preferences[formattedDate] = {};
      }
      Object.assign(desiderata[d.userId].preferences[formattedDate], creneauxJour);
    });
  });
  return desiderata;
};

const estWeekEnd = (date) => {
  const jour = new Date(date).getUTCDay();
  return jour === 0 || jour === 6;
};

const aGardeWeekEnd = (medecinId, date, planning) => {
  const dateObj = new Date(date);
  const jour = dateObj.getUTCDay();
  const debutWeekEnd = new Date(dateObj); debutWeekEnd.setUTCDate(dateObj.getUTCDate() - jour);
  const finWeekEnd = new Date(dateObj); finWeekEnd.setUTCDate(dateObj.getUTCDate() - jour + 6);

  for (let d = new Date(debutWeekEnd); d <= finWeekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    if (planning[dateString] && Object.values(planning[dateString]).flat().includes(medecinId)) {
      return true;
    }
  }
  return false;
};

const aGardeJour = (medecinId, date, planning) => {
  return planning[date] && Object.values(planning[date]).flat().includes(medecinId);
};

const aRenfortJour = (medecinId, date, planning) => {
  return planning[date] && (
    planning[date]['RENFORT_1']?.includes(medecinId) ||
    planning[date]['RENFORT_2']?.includes(medecinId)
  );
};

export const evaluerPlanning = (planning, desiderata) => {
  let score = 0;
  const gardesParMedecinParSemaine = {};
  const gardesParMedecinParMois = {};

  for (const date in planning) {
    for (const creneauId in planning[date]) {
      for (const medecinId of planning[date][creneauId]) {
        if (medecinId === null) { continue; }

        // Compter les gardes par semaine
        const semaine = cleSemaineISO(date);
        if (!gardesParMedecinParSemaine[medecinId]) {
          gardesParMedecinParSemaine[medecinId] = {};
        }
        if (!gardesParMedecinParSemaine[medecinId][semaine]) {
          gardesParMedecinParSemaine[medecinId][semaine] = 0;
        }
        gardesParMedecinParSemaine[medecinId][semaine]++;

        // Pénalité pour dépassement du maximum de gardes par semaine
        const maxGardes = desiderata[medecinId]?.nombreGardesMaxParSemaine || 7;
        if (gardesParMedecinParSemaine[medecinId][semaine] > maxGardes) {
          score -= 20;
        }

        // Pénalité pour les chevauchements
        if (aCreneauxChevauchants(medecinId, date, creneauId, planning)) {
          score -= 50;
        }

        // Comptage par mois (l'objectif « gardes souhaitées » est mensuel).
        const mois = date.slice(0, 7);
        if (!gardesParMedecinParMois[medecinId]) { gardesParMedecinParMois[medecinId] = {}; }
        if (!gardesParMedecinParMois[medecinId][mois]) { gardesParMedecinParMois[medecinId][mois] = 0; }
        gardesParMedecinParMois[medecinId][mois]++;

        const choix = desiderata[medecinId]?.preferences[date]?.[creneauId];
        if (choix === 'Oui') { score += 3; }
        else if (choix === 'Possible') { score += 1; }
        else if (choix === 'Non') { score -= 5; }

        // Gardes groupées
        if (desiderata[medecinId]?.gardesGroupees && estWeekEnd(date) && aGardeWeekEnd(medecinId, date, planning)) {
          score += 2;
        }

        // Renforts associés
        if (desiderata[medecinId]?.renfortsAssocies) {
          if (creneauId.startsWith('RENFORT') && aGardeJour(medecinId, date, planning)) { score += 2; }
          if (!creneauId.startsWith('RENFORT') && aRenfortJour(medecinId, date, planning)) { score += 2; }
        }
      }
    }
  }

  // Écart au nombre de gardes souhaitées, évalué PAR MOIS (le réglage
  // « Gardes souhaitées par mois » est un objectif mensuel). Défaut 0.
  for (const medecinId in gardesParMedecinParMois) {
    const souhaitees = desiderata[medecinId]?.nombreGardesSouhaitees || 0;
    for (const mois in gardesParMedecinParMois[medecinId]) {
      const diff = Math.abs(gardesParMedecinParMois[medecinId][mois] - souhaitees);
      score -= diff * 2;
    }
  }

  return score;
};

export const verifierContraintes = (planning, desiderata = {}) => {
  const dates = Object.keys(planning).sort();
  const gardesParMedecinParSemaine = {};

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const semaine = cleSemaineISO(date);
    const medecinsDuJour = new Set();

    // Chevauchements + comptage des gardes (occurrences de créneaux) par semaine
    for (const creneauId in planning[date]) {
      const medecins = planning[date][creneauId];
      for (const medecinId of medecins) {
        if (medecinId === null) { continue; }

        if (aCreneauxChevauchants(medecinId, date, creneauId, planning)) {
          return false;
        }

        medecinsDuJour.add(medecinId);

        if (!gardesParMedecinParSemaine[medecinId]) {
          gardesParMedecinParSemaine[medecinId] = {};
        }
        if (!gardesParMedecinParSemaine[medecinId][semaine]) {
          gardesParMedecinParSemaine[medecinId][semaine] = 0;
        }
        gardesParMedecinParSemaine[medecinId][semaine]++;
      }
    }

    // Vérifier les gardes consécutives (pas plus de 2 jours d'affilée)
    for (const medecinId of medecinsDuJour) {
      if (i >= 2) {
        const hierMedecins = new Set();
        const avantHierMedecins = new Set();

        Object.values(planning[dates[i - 1]]).forEach(medecins => {
          medecins.forEach(m => { if (m !== null) { hierMedecins.add(m); } });
        });

        Object.values(planning[dates[i - 2]]).forEach(medecins => {
          medecins.forEach(m => { if (m !== null) { avantHierMedecins.add(m); } });
        });

        if (hierMedecins.has(medecinId) && avantHierMedecins.has(medecinId)) {
          return false;
        }
      }
    }
  }

  // Respect du nombre maximum de gardes par semaine, PROPRE À CHAQUE MÉDECIN
  // (défaut 7 si le desiderata n'est pas fourni).
  for (const medecinId in gardesParMedecinParSemaine) {
    const maxGardesParSemaine = desiderata[medecinId]?.nombreGardesMaxParSemaine || 7;
    for (const semaine in gardesParMedecinParSemaine[medecinId]) {
      if (gardesParMedecinParSemaine[medecinId][semaine] > maxGardesParSemaine) {
        return false;
      }
    }
  }

  return true;
};

// ============================================================================
// Génération « par ordre de priorité »
// ============================================================================

// Renvoie true si affecter ce médecin à cette date créerait une série de 3 jours
// de garde consécutifs. Contrôle SYMÉTRIQUE : on interdit J si l'une des trois
// fenêtres glissantes contenant J serait entièrement couverte —
// (J-2,J-1,J), (J-1,J,J+1) ou (J,J+1,J+2). Le contrôle « en arrière seul »
// (J-1 & J-2) était insuffisant pour la passe LARGEUR, qui s'exécute après coup
// sur des dates déjà remplies et pouvait donc créer un triplet vers l'avant
// (ex. placer J alors que J+1 et J+2 sont déjà des gardes). Dates en UTC.
export const creeraitTroisJoursConsecutifs = (medecinId, dateString, planning) => {
  const jour = new Date(dateString);
  const gardeDecalee = (offset) => {
    const d = new Date(jour); d.setUTCDate(d.getUTCDate() + offset);
    return aGardeJour(medecinId, d.toISOString().split('T')[0], planning);
  };
  const avantVeille = gardeDecalee(-2);
  const veille = gardeDecalee(-1);
  const lendemain = gardeDecalee(1);
  const surlendemain = gardeDecalee(2);
  return (avantVeille && veille) || (veille && lendemain) || (lendemain && surlendemain);
};

// Remplissage « COUVERTURE D'ABORD » d'un jour : on donne d'abord 1 médecin à CHAQUE
// créneau (round 1) avant d'en donner un 2e (round 2), etc. — et à chaque round on traite
// le créneau le plus RARE en premier (moins de candidats éligibles). Cette stratégie couvre
// plus de créneaux distincts que le glouton par médecin (qui remplissait un créneau à fond en
// laissant les rares à 0), car elle utilise le quota RESTANT de chacun — SANS jamais dépasser
// le quota mensuel (souhait). Ordre de choix respecté : à créneau donné, priorité au médecin
// le mieux placé dans l'ordre, préférences « Oui » avant « Possible ». Les médecins sans
// souhait explicite (0) restent flexibles (bornés par le max hebdo), ils comblent les vacances.
const remplirJourEnCouverture = (dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning, gardesAttribuees) => {
  const mois = dateString.slice(0, 7);
  const jour = planning[dateString];
  const cids = creneaux.map((c) => c.id).filter((id) => jour[id]); // créneaux ouverts ce jour, ordre canonique

  // Liste déterministe des médecins par ordre de choix (rang unique = départage stable).
  const ids = []; const rank = {}; const vus = new Set();
  for (const nom of ordrePriorite) {
    const id = mapMedecinNomVersId[nom];
    if (id && desiderata[id] && !vus.has(id)) { vus.add(id); rank[id] = ids.length; ids.push(id); }
  }

  const gardesMois = (id) => (gardesAttribuees[id]?.[mois] || 0);
  const gardesJour = (id) => Object.values(jour).reduce((n, arr) => n + (arr.includes(id) ? 1 : 0), 0);

  // Préférence ('Oui'/'Possible') si le médecin est éligible pour ce créneau ; sinon null.
  // Mêmes contraintes dures + quota mensuel STRICT (souhait 0 = flexible).
  const prefEligible = (id, cid) => {
    if (jour[cid].includes(id)) { return null; }                          // déjà dans ce créneau
    const pref = desiderata[id].preferences[dateString]?.[cid];
    if (pref !== 'Oui' && pref !== 'Possible') { return null; }
    const souhait = desiderata[id].nombreGardesSouhaitees;
    if (souhait && gardesMois(id) >= souhait) { return null; }            // quota mensuel jamais dépassé
    const maxSem = desiderata[id].nombreGardesMaxParSemaine || 7;
    if (compterGardesParSemaine(id, dateString, planning) >= maxSem) { return null; }
    if (gardesJour(id) >= MAX_CRENEAUX_PAR_JOUR) { return null; }
    if (aCreneauxChevauchants(id, dateString, cid, planning)) { return null; }
    if (creeraitTroisJoursConsecutifs(id, dateString, planning)) { return null; }
    return pref;
  };

  // Candidats éligibles pour un créneau, triés : Oui avant Possible, puis ordre de choix.
  const candidatsPour = (cid) => {
    const out = [];
    for (const id of ids) {
      const pref = prefEligible(id, cid);
      if (pref) { out.push({ id, possible: pref === 'Possible' ? 1 : 0 }); }
    }
    out.sort((a, b) => (a.possible - b.possible) || (rank[a.id] - rank[b.id]));
    return out;
  };

  const effectifMax = cids.reduce((m, cid) => Math.max(m, jour[cid].length), 0);
  for (let r = 1; r <= effectifMax; r++) {
    // Créneaux qui veulent leur r-ème médecin (exactement r-1 remplis, effectif >= r).
    const wanting = cids.filter((cid) => jour[cid].filter((m) => m !== null).length === r - 1 && jour[cid].length >= r);
    // Le plus RARE d'abord (moins de candidats) ; tie-break stable = ordre canonique des créneaux.
    const nbCand = {};
    wanting.forEach((cid) => { nbCand[cid] = candidatsPour(cid).length; });
    wanting.sort((a, b) => (nbCand[a] - nbCand[b]) || (cids.indexOf(a) - cids.indexOf(b)));

    for (const cid of wanting) {
      const cands = candidatsPour(cid); // recalcul : l'état a changé pendant ce round
      if (cands.length === 0) { continue; }
      const choisi = cands[0].id;
      jour[cid][jour[cid].indexOf(null)] = choisi;
      gardesAttribuees[choisi] = gardesAttribuees[choisi] || {};
      gardesAttribuees[choisi][mois] = gardesMois(choisi) + 1;
    }
  }
};

export const diviserPeriode = (debut, fin) => {
  const startDate = new Date(debut);
  const endDate = new Date(fin);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const premierTourDays = Math.min(45, Math.floor(totalDays / 2));
  const deuxiemeTourStart = new Date(startDate);
  deuxiemeTourStart.setUTCDate(deuxiemeTourStart.getUTCDate() + premierTourDays);

  return {
    premierTour: {
      debut: startDate.toISOString().split('T')[0],
      fin: new Date(deuxiemeTourStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    deuxiemeTour: {
      debut: deuxiemeTourStart.toISOString().split('T')[0],
      fin: endDate.toISOString().split('T')[0]
    }
  };
};

const genererPlanningPourPeriode = (debut, fin, ordrePriorite, mapMedecinNomVersId, desiderata, gardesAttribuees, planning) => {
  const currentDate = new Date(debut);
  const endDate = new Date(fin);

  // Générer jour par jour
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    planning[dateString] = {};

    // Initialiser tous les créneaux ouverts ce jour (effectif variable par
    // type de jour : semaine / samedi / dimanche / férié).
    creneaux.forEach(creneau => {
      const effectif = effectifPour(creneau.id, dateString);
      if (effectif > 0) {
        planning[dateString][creneau.id] = Array(effectif).fill(null);
      }
    });

    // Remplissage « COUVERTURE D'ABORD » : 1 médecin par créneau (créneaux rares en
    // premier) avant d'en remplir un 2e, quota strict + contraintes dures respectés.
    remplirJourEnCouverture(dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning, gardesAttribuees);

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return planning;
};

// Entrée pure « priorité » : division en deux tours puis attribution séquentielle.
export const computePriorite = (debut, fin, desiderata, mapMedecinNomVersId, listePriorite) => {
  const periodes = diviserPeriode(debut, fin);

  // Compteur PARTAGÉ entre les deux tours, indexé par médecin PUIS par mois :
  // le quota « gardes souhaitées par mois » est ainsi respecté sur le mois réel
  // (et non réinitialisé à chaque tour, ce qui doublait les gardes). Le planning
  // est également partagé pour assurer la continuité entre les tours (comptage
  // hebdomadaire et règle des jours consécutifs au passage d'un tour à l'autre).
  const gardesAttribuees = {};
  const planning = {};

  genererPlanningPourPeriode(
    periodes.premierTour.debut,
    periodes.premierTour.fin,
    listePriorite.premierTour,
    mapMedecinNomVersId,
    desiderata,
    gardesAttribuees,
    planning
  );

  genererPlanningPourPeriode(
    periodes.deuxiemeTour.debut,
    periodes.deuxiemeTour.fin,
    listePriorite.deuxiemeTour,
    mapMedecinNomVersId,
    desiderata,
    gardesAttribuees,
    planning
  );

  // Filet de sécurité : le planning généré DOIT satisfaire les contraintes dures
  // (max hebdo, pas 3 jours consécutifs, pas de chevauchement). Tripwire de non-
  // régression — n'altère pas le planning, signale seulement une éventuelle violation.
  if (!verifierContraintes(planning, desiderata)) {
    logger.warn('computePriorite: le planning généré viole verifierContraintes (contrainte dure).');
  }

  logger.info('Répartition des gardes attribuées (par mois):', gardesAttribuees);

  // Compter les créneaux non pourvus (diagnostic).
  let creneauxVides = 0;
  let creneauxTotal = 0;
  Object.values(planning).forEach(joursCreneaux => {
    Object.values(joursCreneaux).forEach(medecins => {
      medecins.forEach(medecin => {
        creneauxTotal++;
        if (medecin === null) { creneauxVides++; }
      });
    });
  });
  logger.info(`Créneaux non pourvus: ${creneauxVides}/${creneauxTotal}`);

  return planning;
};
