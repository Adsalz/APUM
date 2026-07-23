// src/utils/planningCore.js
// Cœur de calcul PUR de la génération de planning — AUCUN accès Firebase, afin
// de pouvoir s'exécuter dans un Web Worker (et être testé sans mock lourd).
// Regroupe les fonctions auparavant dupliquées dans planningGenerator.js et
// planningGeneratorPriorite.js (source unique). La couche I/O (récupération des
// desiderata/médecins) reste dans ces deux fichiers.
import logger from './logger';
import { estJourFerie } from './joursFeries';

export const creneaux = [
  { id: 'QUART_1', label: '1er QUART (1h - 7h)', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART (7h - 13h)', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT 10h / 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART (13h - 19h)', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT 20H / 00H', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART (19h - 1h)', medecins: 3 }
];

// Quota mensuel par défaut pour les médecins n'ayant PAS renseigné leur « nombre
// de gardes souhaitées » (champ vide = 0). Sans ce défaut, ils seraient soit
// ignorés des tours prioritaires, soit sur-servis sans limite par le fallback.
const DEFAUT_GARDES_MENSUEL = 8;

// Plafond de créneaux (gardes) qu'un même médecin peut cumuler le MÊME jour.
// Calibré sur la feuille de référence APUM (« TABLEAUX MOIS PAR MOIS ») : le manuel
// empile jusqu'à 2 créneaux/jour mais JAMAIS 3 (0 cas sur 854 affectations réelles).
// Sans ce plafond, la passe principale produisait des enchaînements de 3 créneaux =
// jusqu'à 18h continues (ex. QUART_2+QUART_3+QUART_4 = 7h→1h). Les passes fallback et
// largeur imposent déjà « 1/jour » ; ce plafond rend la passe principale cohérente.
const MAX_CRENEAUX_PAR_JOUR = 2;

// Effectifs cibles par TYPE DE JOUR, déduits de la feuille de garde de référence
// APUM (« TABLEAUX MOIS PAR MOIS »). Un JOUR FÉRIÉ compte comme un DIMANCHE
// (vérifié sur la référence : le 15/08, pourtant un samedi, n'a pas de renfort
// 10h/13h et suit les effectifs d'un dimanche).
// 0 = le créneau n'existe pas ce jour-là (ex. renfort 10h/13h hors samedi).
// NB : le SOUS-EFFECTIF d'AOÛT (congés d'été) est un facteur SAISONNIER, PAS une
// règle de type de jour → ne PAS l'encoder ici. Il émerge naturellement des
// desiderata (médecins indisponibles en août laissant des créneaux non pourvus).
// Pour ajuster le nombre de médecins par garde, modifier UNIQUEMENT ce tableau.
const EFFECTIFS_PAR_TYPE_JOUR = {
  //             semaine     samedi      dimanche (= férié)
  QUART_1:   { semaine: 2, samedi: 2, dimanche: 2 },
  QUART_2:   { semaine: 3, samedi: 3, dimanche: 4 },
  RENFORT_1: { semaine: 0, samedi: 1, dimanche: 0 },
  QUART_3:   { semaine: 3, samedi: 4, dimanche: 4 },
  RENFORT_2: { semaine: 1, samedi: 1, dimanche: 1 },
  QUART_4:   { semaine: 3, samedi: 2, dimanche: 3 },
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

export const compterGardesParSemaine = (medecinId, date, planning) => {
  const weekNumber = getWeekNumber(date);
  let count = 0;

  Object.entries(planning).forEach(([planningDate, creneauxDuJour]) => {
    if (getWeekNumber(planningDate) === weekNumber) {
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
        const semaine = getWeekNumber(date);
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
    const semaine = getWeekNumber(date);
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
const creeraitTroisJoursConsecutifs = (medecinId, dateString, planning) => {
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

const attribuerCreneauxParPreference = (
  medecinId, dateString, preferenceType, nombreGardesSouhaitees, maxGardesParSemaine,
  desiderata, planning, gardesAttribuees
) => {
  const mois = dateString.slice(0, 7);
  const compteur = gardesAttribuees[medecinId] || (gardesAttribuees[medecinId] = {});

  // Respect strict du quota MENSUEL demandé (« gardes souhaitées par mois »).
  if ((compteur[mois] || 0) >= nombreGardesSouhaitees) {
    return; // Quota du mois atteint
  }

  const gardesParSemaine = compterGardesParSemaine(medecinId, dateString, planning);
  if (gardesParSemaine >= maxGardesParSemaine) {
    return; // Limite hebdomadaire atteinte
  }

  // Pas plus de 2 jours de garde consécutifs.
  if (creeraitTroisJoursConsecutifs(medecinId, dateString, planning)) {
    return;
  }

  const preferencesJour = desiderata[medecinId].preferences[dateString] || {};

  // Parcourir tous les créneaux pour cette préférence
  for (const creneau of creneaux) {
    // Plafond de créneaux PAR JOUR pour ce médecin (cohérent avec le « 1/jour » des
    // passes fallback/largeur ; évite les enchaînements de 3 créneaux le même jour).
    const gardesCeJour = Object.values(planning[dateString])
      .filter((slots) => slots.includes(medecinId)).length;
    if (gardesCeJour >= MAX_CRENEAUX_PAR_JOUR) {
      break;
    }

    // Vérifier à nouveau le quota à chaque attribution
    if ((compteur[mois] || 0) >= nombreGardesSouhaitees) {
      break;
    }

    // Vérifier AUSSI le maximum HEBDOMADAIRE à chaque attribution : le contrôle
    // d'entrée ne s'exécute qu'une fois, or un médecin disponible sur plusieurs
    // créneaux le même jour pouvait sinon dépasser son plafond hebdomadaire.
    if (compterGardesParSemaine(medecinId, dateString, planning) >= maxGardesParSemaine) {
      break;
    }

    if (!planning[dateString][creneau.id]) {
      continue;
    }

    const preference = preferencesJour[creneau.id];

    // Seulement le type de préférence demandé
    if (preference !== preferenceType) {
      continue;
    }

    // Vérifier les chevauchements
    if (aCreneauxChevauchants(medecinId, dateString, creneau.id, planning)) {
      continue;
    }

    // Chercher une place libre dans ce créneau
    const indexLibre = planning[dateString][creneau.id].findIndex(m => m === null);
    if (indexLibre !== -1) {
      planning[dateString][creneau.id][indexLibre] = medecinId;
      compteur[mois] = (compteur[mois] || 0) + 1;
    }
  }
};

const remplirCreneauxVidesAvecDisponibles = (dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning, gardesAttribuees) => {
  const mois = dateString.slice(0, 7);
  const quotaEffectif = (id) => desiderata[id].nombreGardesSouhaitees || DEFAUT_GARDES_MENSUEL;
  const gardesDuMois = (id) => (gardesAttribuees[id]?.[mois] || 0);

  // Parcourir tous les créneaux pour trouver les places vides
  for (const creneau of creneaux) {
    if (!planning[dateString][creneau.id]) {
      continue;
    }

    const placesVides = planning[dateString][creneau.id]
      .map((medecin, index) => medecin === null ? index : -1)
      .filter(index => index !== -1);

    for (const indexVide of placesVides) {
      // Rassembler tous les médecins ÉLIGIBLES (dispo Oui/Possible + toutes les
      // contraintes dures respectées + quota mensuel NON dépassé). L'ordre de
      // priorité sert de départage (collecte dans cet ordre → tri stable).
      const candidats = [];
      for (const nomMedecin of ordrePriorite) {
        const medecinId = mapMedecinNomVersId[nomMedecin];
        if (!medecinId || !desiderata[medecinId]) {
          continue;
        }

        const preference = desiderata[medecinId].preferences[dateString]?.[creneau.id];
        // SEULEMENT "Oui" ou "Possible" - jamais "Non".
        if (preference !== 'Oui' && preference !== 'Possible') {
          continue;
        }

        // Quota mensuel : ne JAMAIS sur-servir au-delà du nombre EXPLICITEMENT
        // souhaité. Les médecins n'ayant pas renseigné de quota (champ vide) ne
        // sont PAS bloqués ici : ils servent à combler les créneaux vacants
        // (seules les limites hebdo / consécutives / chevauchement s'appliquent).
        const quotaSouhaite = desiderata[medecinId].nombreGardesSouhaitees;
        if (quotaSouhaite && gardesDuMois(medecinId) >= quotaSouhaite) {
          continue;
        }

        const maxGardesParSemaine = desiderata[medecinId].nombreGardesMaxParSemaine || 7;
        if (compterGardesParSemaine(medecinId, dateString, planning) >= maxGardesParSemaine) {
          continue;
        }
        if (aCreneauxChevauchants(medecinId, dateString, creneau.id, planning)) {
          continue;
        }
        // Pas plus de 2 jours de garde consécutifs.
        if (creeraitTroisJoursConsecutifs(medecinId, dateString, planning)) {
          continue;
        }
        // Un seul créneau par médecin et par jour via le fallback.
        const dejaAssigneAujourdhui = Object.values(planning[dateString]).some(medecins =>
          medecins.includes(medecinId)
        );
        if (dejaAssigneAujourdhui) {
          continue;
        }

        candidats.push(medecinId);
      }

      if (candidats.length === 0) {
        // Personne de disponible sous son quota → créneau laissé vacant plutôt
        // que de surcharger quelqu'un contre son nombre de gardes souhaité.
        continue;
      }

      // Équité : servir en priorité le médecin le plus « en manque » (plus grand
      // écart entre quota souhaité et gardes déjà attribuées ce mois-ci).
      candidats.sort((a, b) =>
        (quotaEffectif(b) - gardesDuMois(b)) - (quotaEffectif(a) - gardesDuMois(a))
      );
      const choisi = candidats[0];

      planning[dateString][creneau.id][indexVide] = choisi;
      gardesAttribuees[choisi] = gardesAttribuees[choisi] || {};
      gardesAttribuees[choisi][mois] = gardesDuMois(choisi) + 1;
      logger.info(`Fallback: ${choisi} assigné à ${creneau.id} le ${dateString} (écart quota: ${quotaEffectif(choisi) - gardesDuMois(choisi)})`);
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

    // Attribution séquentielle complète par ordre de priorité
    for (const nomMedecin of ordrePriorite) {
      const medecinId = mapMedecinNomVersId[nomMedecin];
      if (!medecinId || !desiderata[medecinId]) {
        continue;
      }

      const nombreGardesSouhaitees = desiderata[medecinId].nombreGardesSouhaitees || DEFAUT_GARDES_MENSUEL;
      const maxGardesParSemaine = desiderata[medecinId].nombreGardesMaxParSemaine || 7;

      // Attribuer toutes les gardes possibles à ce médecin avant de passer au suivant
      // Phase 1: D'abord tous les créneaux "Oui"
      attribuerCreneauxParPreference(
        medecinId, dateString, 'Oui', nombreGardesSouhaitees, maxGardesParSemaine,
        desiderata, planning, gardesAttribuees
      );

      // Phase 2: Puis tous les créneaux "Possible" si pas encore au quota
      attribuerCreneauxParPreference(
        medecinId, dateString, 'Possible', nombreGardesSouhaitees, maxGardesParSemaine,
        desiderata, planning, gardesAttribuees
      );
    }

    // Phase 3: FALLBACK - Remplir les créneaux vides avec les médecins disponibles (Oui/Possible)
    remplirCreneauxVidesAvecDisponibles(dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning, gardesAttribuees);

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return planning;
};

// Passe « LARGEUR » : après les deux tours, combler les places encore vides
// (y compris dans les créneaux PARTIELLEMENT remplis) SANS JAMAIS dépasser le quota
// mensuel donné par le médecin (mêmes règles que remplirCreneauxVidesAvecDisponibles).
// Les médecins sans souhait explicite (0) ne sont pas bloqués — ils comblent les
// vacances. On sert d'abord le plus « en manque » (tri par déficit décroissant). Un
// créneau pour lequel il ne reste que des médecins à leur quota est laissé VIDE
// (l'admin le complète à la main) plutôt que de sur-charger quelqu'un contre son gré.
const comblerCreneauxVidesEnLargeur = (planning, ordrePriorite, mapMedecinNomVersId, desiderata, gardesAttribuees) => {
  const gardesDuMoisPlanning = (id, mois) => {
    let n = 0;
    for (const [d, cs] of Object.entries(planning)) {
      if (d.slice(0, 7) !== mois) { continue; }
      for (const arr of Object.values(cs)) { if (arr.includes(id)) { n++; } }
    }
    return n;
  };
  const quotaEffectif = (id) => desiderata[id].nombreGardesSouhaitees || DEFAUT_GARDES_MENSUEL;

  for (const dateString of Object.keys(planning).sort()) {
    const mois = dateString.slice(0, 7);
    for (const creneau of creneaux) {
      const arr = planning[dateString][creneau.id];
      if (!arr) { continue; }

      // Combler CHAQUE place vide (y compris les créneaux partiellement remplis).
      for (let indexVide = 0; indexVide < arr.length; indexVide++) {
        if (arr[indexVide] !== null) { continue; }

        // Recalculé à chaque place : un médecin placé plus tôt ce jour est exclu.
        const assignesJour = new Set();
        Object.values(planning[dateString]).forEach((slots) =>
          slots.forEach((m) => { if (m) { assignesJour.add(m); } }));

        const candidats = [];
        for (const nomMedecin of ordrePriorite) {
          const id = mapMedecinNomVersId[nomMedecin];
          if (!id || !desiderata[id] || assignesJour.has(id)) { continue; }
          const pref = desiderata[id].preferences[dateString]?.[creneau.id];
          if (pref !== 'Oui' && pref !== 'Possible') { continue; }
          const maxSem = desiderata[id].nombreGardesMaxParSemaine || 7;
          if (compterGardesParSemaine(id, dateString, planning) >= maxSem) { continue; }
          if (aCreneauxChevauchants(id, dateString, creneau.id, planning)) { continue; }
          if (creeraitTroisJoursConsecutifs(id, dateString, planning)) { continue; }
          candidats.push(id);
        }
        if (candidats.length === 0) { continue; }

        // Deux niveaux : d'abord les médecins ENCORE sous leur quota mensuel (tri par
        // déficit décroissant) ; sinon, dépassement en dernier recours (moins chargé).
        // Respect STRICT du quota donné par le médecin : ne JAMAIS dépasser le souhait
        // mensuel explicite. Les médecins sans souhait explicite (0) ne sont pas bloqués.
        const eligibles = candidats.filter((id) => {
          const souhait = desiderata[id].nombreGardesSouhaitees;
          return !(souhait && gardesDuMoisPlanning(id, mois) >= souhait);
        });
        if (eligibles.length === 0) { continue; } // que des médecins à leur quota → laisser vide
        // Servir en priorité le plus « en manque » (aligné sur le fallback).
        eligibles.sort((a, b) =>
          (quotaEffectif(b) - gardesDuMoisPlanning(b, mois)) - (quotaEffectif(a) - gardesDuMoisPlanning(a, mois)));
        const choisi = eligibles[0];

        arr[indexVide] = choisi;
        gardesAttribuees[choisi] = gardesAttribuees[choisi] || {};
        gardesAttribuees[choisi][mois] = (gardesAttribuees[choisi][mois] || 0) + 1;
      }
    }
  }
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

  // Passe LARGEUR : combler les places encore vides (y compris partiellement remplies).
  const ordreComplet = [...new Set([...listePriorite.premierTour, ...listePriorite.deuxiemeTour])];
  comblerCreneauxVidesEnLargeur(planning, ordreComplet, mapMedecinNomVersId, desiderata, gardesAttribuees);

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
