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

// Créneaux dont la charge est RÉPARTIE ÉQUITABLEMENT entre les médecins avant
// d'être doublée : on sert la 1re du mois à chacun avant d'en donner une 2e à
// quiconque. Déduit de la feuille de référence APUM ASO26, où le 1er quart
// (1h-7h) suit une règle d'équité que l'ordre de choix ne produit pas seul :
// 25 médecins sur 36 y ont EXACTEMENT 3 nuits sur le trimestre (= 1 par mois),
// les 11 autres — des volontaires — absorbant le surplus (jusqu'à 11 nuits).
// Sans cette règle, la répartition dérivait de la seule disponibilité déclarée
// (un médecin à 12 nuits, un autre à 1) — écart signalé par la coordinatrice.
// Ce n'est PAS un quota imposé : qui n'a déclaré aucune disponibilité de nuit
// n'en reçoit aucune, et le surplus va à ceux qui peuvent le prendre.
export const CRENEAUX_REPARTITION_EQUITABLE = ['QUART_1'];

// Créneaux qu'un même médecin ne peut PAS prendre deux jours d'affilée. Règle
// observée sur la feuille de référence APUM ASO26 : le 2 août, la coordinatrice
// a laissé une place de nuit VIDE plutôt que de redonner un 1h-7h au seul médecin
// encore disponible, qui en avait déjà fait un la veille. La couverture cède donc
// devant cette contrainte — c'est un arbitrage assumé, pas un effet de bord.
export const CRENEAUX_SANS_JOURS_CONSECUTIFS = ['QUART_1'];

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

// Créneaux qui se recouvrent DANS LA MÊME JOURNÉE — un médecin ne peut pas tenir
// les deux à la fois.
//
// DÉLIBÉRÉMENT ABSENT : l'enchaînement 4ème quart (19h-1h) puis 1er quart (1h-7h)
// LE LENDEMAIN, soit 19h→7h d'affilée. Ce n'est pas un oubli — arbitrage de la
// coordinatrice (août 2026) : un médecin qui répond « Oui » à la soirée ET « Oui »
// à la nuit qui suit a le droit de faire les deux. La feuille de référence ASO26
// en contient 25 occurrences. Ne pas « corriger » sans revalider avec elle.
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

    // Chevauchements + comptage des gardes (occurrences de créneaux) par semaine
    for (const creneauId in planning[date]) {
      const medecins = planning[date][creneauId];
      for (const medecinId of medecins) {
        if (medecinId === null) { continue; }

        if (aCreneauxChevauchants(medecinId, date, creneauId, planning)) {
          return false;
        }


        if (!gardesParMedecinParSemaine[medecinId]) {
          gardesParMedecinParSemaine[medecinId] = {};
        }
        if (!gardesParMedecinParSemaine[medecinId][semaine]) {
          gardesParMedecinParSemaine[medecinId][semaine] = 0;
        }
        gardesParMedecinParSemaine[medecinId][semaine]++;
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
// de garde consécutifs (évitée au tirage, tolérée au comblement — voir TROIS_JOURS_CONSECUTIFS). Contrôle SYMÉTRIQUE : on interdit J si l'une des trois
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

// Renvoie true si affecter ce médecin à ce créneau créerait deux jours consécutifs
// sur un créneau à repos obligatoire (1h-7h). Contrôle SYMÉTRIQUE (veille ET
// lendemain) : la passe de remplissage progresse jour par jour, mais les deux
// tours de l'ordre de choix se partagent le même planning, et un jour ultérieur
// peut déjà être rempli. Dates en UTC, comme creeraitTroisJoursConsecutifs.
export const creeraitCreneauxConsecutifs = (medecinId, dateString, creneauId, planning) => {
  if (!CRENEAUX_SANS_JOURS_CONSECUTIFS.includes(creneauId)) { return false; }
  const jour = new Date(dateString);
  const aLeCreneau = (offset) => {
    const d = new Date(jour); d.setUTCDate(d.getUTCDate() + offset);
    const cle = d.toISOString().split('T')[0];
    return Boolean(planning[cle]?.[creneauId]?.includes(medecinId));
  };
  return aLeCreneau(-1) || aLeCreneau(1);
};

// Trois jours de garde d'affilée : ÉVITÉS au tirage, AUTORISÉS au comblement (dernier
// recours). Décision du 27/08/2026 : la coordinatrice le fait 76 fois sur le trimestre
// ASO26, sans le réserver aux places rares — ce n'est pas un interdit chez elle.
// Mesuré sur ASO26 : interdit partout 881 places ; dernier recours 905 (38 séquences de
// 3 jours) ; libre partout 901 (109 séquences). Le dernier recours domine sur tout :
// plus de places, quatre fois moins d'enchaînements, meilleure fidélité au manuel.
// L'écran d'édition le signale comme un point FORT (à vérifier), plus comme un blocage.
export const TROIS_JOURS_CONSECUTIFS = 'dernier-recours';

// ============================================================================
// Contraintes DURES communes au tirage et au comblement — source unique.
// (La préférence et le quota sont vérifiés par l'appelant : ils diffèrent d'une passe à l'autre.)
// `troisJoursAutorises` : true pour le comblement (dernier recours), false au tirage.
// ============================================================================
const contrainteDureBloque = (id, dateString, cid, desiderata, planning, troisJoursAutorises = false) => {
  const maxSem = desiderata[id].nombreGardesMaxParSemaine || 7;
  if (compterGardesParSemaine(id, dateString, planning) >= maxSem) { return true; }
  const jour = planning[dateString];
  if (Object.values(jour).reduce((n, arr) => n + (arr.includes(id) ? 1 : 0), 0) >= MAX_CRENEAUX_PAR_JOUR) { return true; }
  if (aCreneauxChevauchants(id, dateString, cid, planning)) { return true; }
  if (creeraitCreneauxConsecutifs(id, dateString, cid, planning)) { return true; }
  if (!troisJoursAutorises && creeraitTroisJoursConsecutifs(id, dateString, planning)) { return true; }
  return false;
};

// Pose un médecin sur la première place libre du créneau et tient les compteurs
// PARTAGÉS par toutes les passes : gardes du mois (quota) et gardes par créneau et
// par mois (équité des nuits).
const poser = (id, dateString, cid, planning, gardesAttribuees, gardesParCreneau) => {
  const mois = dateString.slice(0, 7);
  const arr = planning[dateString][cid];
  arr[arr.indexOf(null)] = id;
  gardesAttribuees[id] = gardesAttribuees[id] || {};
  gardesAttribuees[id][mois] = (gardesAttribuees[id][mois] || 0) + 1;
  gardesParCreneau[id] = gardesParCreneau[id] || {};
  gardesParCreneau[id][mois] = gardesParCreneau[id][mois] || {};
  gardesParCreneau[id][mois][cid] = (gardesParCreneau[id][mois][cid] || 0) + 1;
};

// ============================================================================
// Passe de COMBLEMENT « couverture d'abord » (un jour)
// ============================================================================
// Remplissage « COUVERTURE D'ABORD » d'un jour : on donne d'abord 1 médecin à CHAQUE
// créneau (round 1) avant d'en donner un 2e (round 2), etc. — et à chaque round on traite
// le créneau le plus RARE en premier (moins de candidats éligibles). Cette stratégie couvre
// plus de créneaux distincts que le glouton par médecin (qui remplissait un créneau à fond en
// laissant les rares à 0), car elle utilise le quota RESTANT de chacun — SANS jamais dépasser
// le quota mensuel (souhait). Ordre de choix respecté : à créneau donné, priorité au médecin
// le mieux placé dans l'ordre, préférences « Oui » avant « Possible ». Les médecins sans
// souhait explicite (0) restent flexibles (bornés par le max hebdo), ils comblent les vacances.
// Depuis le tirage (août 2026), cette passe ne sert plus qu'à COMBLER les places
// restées vides après les deux tours ; elle garde ses règles pour les dernières places.
const remplirJourEnCouverture = (dateString, ordrePriorite, desiderata, planning, gardesAttribuees, gardesParCreneau = {}) => {
  const mois = dateString.slice(0, 7);
  const jour = planning[dateString];
  const cids = creneaux.map((c) => c.id).filter((id) => jour[id]); // créneaux ouverts ce jour, ordre canonique

  // Liste déterministe des médecins par ordre de choix (rang unique = départage stable).
  // `ordrePriorite` est une suite d'IDENTIFIANTS : plus aucune résolution par nom
  // ici, donc plus aucun médecin perdu par un accent ou un renommage.
  const ids = []; const rank = {}; const vus = new Set();
  for (const id of ordrePriorite) {
    if (id && desiderata[id] && !vus.has(id)) { vus.add(id); rank[id] = ids.length; ids.push(id); }
  }

  const gardesMois = (id) => (gardesAttribuees[id]?.[mois] || 0);
  // Nombre de fois que ce médecin a déjà pris CE créneau CE mois-ci (répartition équitable).
  const gardesCreneauMois = (id, cid) => (gardesParCreneau[id]?.[mois]?.[cid] || 0);

  // Préférence ('Oui'/'Possible') si le médecin est éligible pour ce créneau ; sinon null.
  // Quota mensuel STRICT (souhait 0 = flexible) + contraintes dures communes.
  const prefEligible = (id, cid) => {
    if (jour[cid].includes(id)) { return null; }                          // déjà dans ce créneau
    const pref = desiderata[id].preferences[dateString]?.[cid];
    if (pref !== 'Oui' && pref !== 'Possible') { return null; }
    const souhait = desiderata[id].nombreGardesSouhaitees;
    if (souhait && gardesMois(id) >= souhait) { return null; }            // quota mensuel jamais dépassé
    if (contrainteDureBloque(id, dateString, cid, desiderata, planning, TROIS_JOURS_CONSECUTIFS === 'dernier-recours')) { return null; }
    return pref;
  };

  // Candidats éligibles pour un créneau, triés : Oui avant Possible, puis ordre de choix.
  // Pour les créneaux à répartition équitable (1h-7h), le nombre de fois que le
  // médecin a DÉJÀ pris ce créneau dans le mois passe AVANT tout le reste : chacun
  // reçoit sa 1re nuit avant que quiconque en reçoive une 2e. À égalité de charge,
  // on retombe sur les critères habituels (Oui avant Possible, puis ordre de choix).
  const candidatsPour = (cid) => {
    const equitableCid = CRENEAUX_REPARTITION_EQUITABLE.includes(cid);
    const out = [];
    for (const id of ids) {
      const pref = prefEligible(id, cid);
      if (pref) {
        out.push({
          id,
          possible: pref === 'Possible' ? 1 : 0,
          deja: equitableCid ? gardesCreneauMois(id, cid) : 0,
        });
      }
    }
    out.sort((a, b) => (a.deja - b.deja) || (a.possible - b.possible) || (rank[a.id] - rank[b.id]));
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
      poser(cands[0].id, dateString, cid, planning, gardesAttribuees, gardesParCreneau);
    }
  }
};

export const diviserPeriode = (debut, fin) => {
  const startDate = new Date(debut);
  const endDate = new Date(fin);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Coupe à la MOITIÉ exacte de la période (1er tour = liste directe, 2e tour =
  // liste inversée), comme le fait la coordinatrice. L'ancien plafond de 45 jours,
  // hérité du code d'origine sans justification, décalait la bascule d'un jour sur
  // les trimestres de 92 jours (45/47 au lieu de 46/46).
  const premierTourDays = Math.floor(totalDays / 2);
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


// ============================================================================
// TIRAGE — la règle de l'ordre de choix : le premier de la liste prend ses gardes,
// puis le deuxième, puis le troisième…
// ============================================================================
// C'est ainsi que la coordinatrice construit le planning, et c'est la règle que les
// médecins connaissent : être bien placé dans l'ordre, c'est choisir avant les autres.
// Le générateur applique exactement cette règle — 1er tour sur la première moitié
// de la période avec la liste, 2e tour sur la seconde avec la liste inversée —
// puis COMBLE les places restées vides (passe « couverture d'abord » ci-dessus).
// Un planning se relit donc la liste sous les yeux : untel a pris ses gardes, puis
// untel, puis untel.
//
// Les réglages ci-dessous ont été LUS dans le planning ASO26 (août→octobre 2026) de
// la coordinatrice, sur les 34 fiches authentiques (analyse du 27/08/2026) :
export const TIRAGE = {
  // Q1 — Les « Possible » servent à BOUCHER, pas à compléter le quota au tour du
  // médecin : sur 197 gardes posées sur un « Possible », 96 l'ont été alors que le
  // médecin avait encore des « Oui » non pris, et elles tombent sur des places à
  // 0,75 volontaire « Oui » par poste (moyenne 1,20). Donc : tous les « Oui » de
  // tout le monde d'abord, les « Possible » ensuite (toujours dans l'ordre de la liste).
  possiblesApresTousLesOui: true,
  // Q2 — Un mois coupé par les deux tours (septembre) est servi AU PRORATA des jours
  // du tour : 51 % des gardes de septembre tombent du 1er au 15, 49 % du 16 au 30,
  // tête et queue de liste confondues ; 2 médecins sur 30 seulement avaient épuisé
  // leur quota de septembre dès la 1re quinzaine. Le reste est servi au tour suivant.
  quotaAuProrataDuTour: true,
  // Q3 — Quand un médecin a plus de « Oui » que de gardes voulues, elle le pose là
  // où il est le PLUS UTILE : les « Oui » qu'elle retient ont 1,28 volontaire par
  // poste, ceux qu'elle laisse 1,81 (aucun biais de calendrier, d'espacement ni de
  // week-end). 'rarete-dynamique' tient compte des quotas déjà consommés (meilleure
  // couverture ET meilleure fidélité mesurées) ; 'rarete-declaree' compte les « Oui »
  // des fiches, tels qu'elle les voit ; 'calendrier' = les premiers jours du mois.
  choixDesJours: 'rarete-dynamique',
  // Équité des nuits (1h-7h) : UNE seule par mois pendant le tirage ; les nuits
  // restantes sont réparties par le comblement (chacun sa 1re avant qu'un autre en ait 2).
  nuitsMaxParMoisPendantTirage: 1,
  // Les médecins sans souhait (0 = flexibles) tirent après ceux qui ont un quota.
  flexiblesEnDernier: true,
};

const listerJours = (debut, fin) => {
  const jours = [];
  const d = new Date(debut); const f = new Date(fin);
  while (d <= f) { jours.push(d.toISOString().split('T')[0]); d.setUTCDate(d.getUTCDate() + 1); }
  return jours;
};

const joursDansLeMois = (mois) => new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0)).getUTCDate();

// Un tour : chaque médecin de `ordreIds`, à son rang, prend ses gardes voulues sur les
// jours du tour. Renvoie le nombre de gardes posées.
const tirerUnTour = (jours, ordreIds, desiderata, planning, gardesAttribuees, gardesParCreneau, options) => {
  if (!jours.length) { return 0; }
  const ids = []; const vus = new Set();
  for (const id of ordreIds || []) { if (id && desiderata[id] && !vus.has(id)) { vus.add(id); ids.push(id); } }
  const aQuota = (id) => desiderata[id].nombreGardesSouhaitees > 0;
  const ordonnes = options.flexiblesEnDernier ? [...ids.filter(aQuota), ...ids.filter((id) => !aQuota(id))] : ids;

  // Quota applicable à un mois pendant CE tour : entier si le mois se termine dans le
  // tour, au prorata des jours du tour sinon (le reste sera servi au tour suivant).
  const joursTourParMois = {};
  jours.forEach((d) => { const m = d.slice(0, 7); joursTourParMois[m] = (joursTourParMois[m] || 0) + 1; });
  const dernierJour = jours[jours.length - 1];
  const quotaDuTour = (id, mois) => {
    const q = desiderata[id].nombreGardesSouhaitees;
    if (!q) { return 0; }
    const finDuMois = `${mois}-${String(joursDansLeMois(mois)).padStart(2, '0')}`;
    if (dernierJour >= finDuMois || !options.quotaAuProrataDuTour) { return q; }
    return Math.ceil((q * joursTourParMois[mois]) / joursDansLeMois(mois));
  };
  const gardesMois = (id, mois) => (gardesAttribuees[id]?.[mois] || 0);

  const eligible = (id, d, cid) => {
    const arr = planning[d][cid];
    if (!arr || !arr.includes(null) || arr.includes(id)) { return false; }
    const mois = d.slice(0, 7);
    const q = quotaDuTour(id, mois);
    if (q && gardesMois(id, mois) >= q) { return false; }
    if (options.nuitsMaxParMoisPendantTirage && CRENEAUX_REPARTITION_EQUITABLE.includes(cid)
        && (gardesParCreneau[id]?.[mois]?.[cid] || 0) >= options.nuitsMaxParMoisPendantTirage) { return false; }
    return !contrainteDureBloque(id, d, cid, desiderata, planning);
  };

  // Rareté d'une place = volontaires par place. 'rarete-declaree' : les « Oui » des
  // fiches, par place ouverte (ce que la coordinatrice voit) ; 'rarete-dynamique' :
  // les volontaires (Oui/Possible) qui ont ENCORE du quota, par place LIBRE.
  const cacheDeclaree = {};
  const rarete = (d, cid, dynamique) => {
    const cle = `${d}|${cid}`;
    if (!dynamique && cacheDeclaree[cle] !== undefined) { return cacheDeclaree[cle]; }
    const arr = planning[d][cid];
    const places = dynamique ? arr.filter((m) => m === null).length : arr.length;
    let volontaires = 0;
    for (const [autre, fiche] of Object.entries(desiderata)) {
      const p = fiche.preferences[d]?.[cid];
      if (dynamique) {
        if ((p !== 'Oui' && p !== 'Possible') || arr.includes(autre)) { continue; }
        const q = fiche.nombreGardesSouhaitees;
        if (q && gardesMois(autre, d.slice(0, 7)) >= q) { continue; }
      } else if (p !== 'Oui') { continue; }
      volontaires++;
    }
    const r = places ? volontaires / places : Infinity;
    if (!dynamique) { cacheDeclaree[cle] = r; }
    return r;
  };

  const cidsCanon = creneaux.map((c) => c.id);
  const donner = (id, pref) => {
    const places = [];
    for (const d of jours) {
      for (const cid of cidsCanon) {
        if (planning[d][cid] && desiderata[id].preferences[d]?.[cid] === pref) { places.push({ d, cid, r: 0 }); }
      }
    }
    if (options.choixDesJours !== 'calendrier') {
      const dynamique = options.choixDesJours === 'rarete-dynamique';
      places.forEach((p) => { p.r = rarete(p.d, p.cid, dynamique); });
      places.sort((a, b) => (a.r - b.r) || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0) || (cidsCanon.indexOf(a.cid) - cidsCanon.indexOf(b.cid)));
    }
    let posees = 0;
    for (const p of places) {
      if (eligible(id, p.d, p.cid)) { poser(id, p.d, p.cid, planning, gardesAttribuees, gardesParCreneau); posees++; }
    }
    return posees;
  };

  let total = 0;
  if (options.possiblesApresTousLesOui) {
    for (const id of ordonnes) { total += donner(id, 'Oui'); }
    for (const id of ordonnes) { total += donner(id, 'Possible'); }
  } else {
    for (const id of ordonnes) { total += donner(id, 'Oui'); total += donner(id, 'Possible'); }
  }
  return total;
};

const compterPourvues = (planning) => {
  let pourvues = 0; let total = 0;
  Object.values(planning).forEach((jour) => Object.values(jour).forEach((arr) => arr.forEach((m) => { total++; if (m !== null) { pourvues++; } })));
  return { pourvues, total };
};

// Entrée pure : TIRAGE (deux tours) puis COMBLEMENT.
export const computePriorite = (debut, fin, desiderata, listePriorite, options = TIRAGE) => {
  const periodes = diviserPeriode(debut, fin);

  // Compteurs PARTAGÉS par toutes les passes, indexés par médecin PUIS par mois : le
  // quota « gardes souhaitées par mois » et l'équité des nuits se raisonnent sur le
  // mois réel, quelle que soit la passe ou le tour qui a posé la garde.
  const gardesAttribuees = {};
  const gardesParCreneau = {};
  const planning = {};
  const joursTour1 = listerJours(periodes.premierTour.debut, periodes.premierTour.fin);
  const joursTour2 = listerJours(periodes.deuxiemeTour.debut, periodes.deuxiemeTour.fin);
  [...joursTour1, ...joursTour2].forEach((d) => {
    planning[d] = {};
    // Créneaux ouverts ce jour (effectif variable par type de jour : semaine / samedi / dimanche / férié).
    creneaux.forEach((c) => { const effectif = effectifPour(c.id, d); if (effectif > 0) { planning[d][c.id] = Array(effectif).fill(null); } });
  });

  // 1. TIRAGE : le premier de la liste prend ses gardes, puis le deuxième…
  const parTirage = tirerUnTour(joursTour1, listePriorite.premierTourIds, desiderata, planning, gardesAttribuees, gardesParCreneau, options)
    + tirerUnTour(joursTour2, listePriorite.deuxiemeTourIds, desiderata, planning, gardesAttribuees, gardesParCreneau, options);

  // 2. COMBLEMENT des places restées vides, jour par jour, avec la liste du tour du jour.
  joursTour1.forEach((d) => remplirJourEnCouverture(d, listePriorite.premierTourIds || [], desiderata, planning, gardesAttribuees, gardesParCreneau));
  joursTour2.forEach((d) => remplirJourEnCouverture(d, listePriorite.deuxiemeTourIds || [], desiderata, planning, gardesAttribuees, gardesParCreneau));

  // Filet de sécurité : le planning généré DOIT satisfaire les contraintes dures
  // (max hebdo, pas de chevauchement). Tripwire de non-
  // régression — n'altère pas le planning, signale seulement une éventuelle violation.
  if (!verifierContraintes(planning, desiderata)) {
    logger.warn('computePriorite: le planning généré viole verifierContraintes (contrainte dure).');
  }

  const { pourvues, total } = compterPourvues(planning);
  logger.info('Répartition des gardes attribuées (par mois):', gardesAttribuees);
  logger.info(`Tirage : ${parTirage} gardes ; comblement : ${pourvues - parTirage} ; non pourvues : ${total - pourvues}/${total}`);

  return planning;
};
