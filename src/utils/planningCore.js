// src/utils/planningCore.js
// Cœur de calcul PUR de la génération de planning — AUCUN accès Firebase, afin
// de pouvoir s'exécuter dans un Web Worker (et être testé sans mock lourd).
// Regroupe les fonctions auparavant dupliquées dans planningGenerator.js et
// planningGeneratorPriorite.js (source unique). La couche I/O (récupération des
// desiderata/médecins) reste dans ces deux fichiers.
import logger from './logger';

export const creneaux = [
  { id: 'QUART_1', label: '1er QUART (1h - 7h)', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART (7h - 13h)', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT 10h / 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART (13h - 19h)', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT 20H / 00H', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART (19h - 1h)', medecins: 3 }
];

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

export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
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

// ============================================================================
// Génération « classique » (solution gloutonne + recherche tabou)
// ============================================================================

const genererPlanningSolution = (debut, fin, desiderata, medecins) => {
  const planning = {};
  const currentDate = new Date(debut);
  const endDate = new Date(fin);

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    planning[dateString] = {};

    // Générer les créneaux dans un ordre spécifique pour mieux gérer les chevauchements
    const ordreCreneaux = [
      'QUART_1',
      'QUART_2',
      'RENFORT_1',
      'QUART_3',
      'QUART_4',
      'RENFORT_2'
    ];

    ordreCreneaux.forEach(creneauId => {
      const creneau = creneaux.find(c => c.id === creneauId);
      if (creneau && (!creneau.samediOnly || currentDate.getDay() === 6)) {
        planning[dateString][creneauId] = assignerMedecins(dateString, creneau, desiderata, medecins, planning);
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return planning;
};

const assignerMedecins = (date, creneau, desiderata, medecins, planning) => {
  const medecinsDispo = medecins.filter(medecinId => {
    const choix = desiderata[medecinId]?.preferences[date]?.[creneau.id];
    const gardesParSemaine = compterGardesParSemaine(medecinId, date, planning);
    const maxGardesParSemaine = desiderata[medecinId]?.nombreGardesMaxParSemaine || 7;
    const aChevauchement = aCreneauxChevauchants(medecinId, date, creneau.id, planning);

    return (choix === 'Oui' || choix === 'Possible') &&
           gardesParSemaine < maxGardesParSemaine &&
           !aChevauchement;
  });

  const medecinsPriorises = medecinsDispo.sort((a, b) => {
    const choixA = desiderata[a]?.preferences[date]?.[creneau.id];
    const choixB = desiderata[b]?.preferences[date]?.[creneau.id];
    if (choixA === 'Oui' && choixB !== 'Oui') { return -1; }
    if (choixB === 'Oui' && choixA !== 'Oui') { return 1; }
    return 0;
  });

  const assignes = [];
  for (let i = 0; i < creneau.medecins; i++) {
    if (medecinsPriorises.length > 0) {
      const medecinChoisi = choisirMedecin(medecinsPriorises, date, creneau, desiderata, planning);
      if (medecinChoisi) {
        assignes.push(medecinChoisi);
        medecinsPriorises.splice(medecinsPriorises.indexOf(medecinChoisi), 1);
      } else {
        assignes.push(null);
      }
    } else {
      assignes.push(null);
    }
  }

  return assignes;
};

const choisirMedecin = (medecinsDispo, date, creneau, desiderata, planning) => {
  const mois = new Date(date).getMonth();
  const medecinsPriorises = medecinsDispo.sort((a, b) => {
    const scoreA = calculerScoreMedecin(a, date, creneau, desiderata, planning, mois);
    const scoreB = calculerScoreMedecin(b, date, creneau, desiderata, planning, mois);
    return scoreB - scoreA;
  });

  return medecinsPriorises[0];
};

const calculerScoreMedecin = (medecinId, date, creneau, desiderata, planning, mois) => {
  let score = 0;
  const prefMedecin = desiderata[medecinId];
  const gardesParSemaine = compterGardesParSemaine(medecinId, date, planning);
  const maxGardesParSemaine = prefMedecin?.nombreGardesMaxParSemaine || 7;

  // Pénalité forte pour les chevauchements
  if (aCreneauxChevauchants(medecinId, date, creneau.id, planning)) {
    score -= 50;
  }

  // Pénalité forte si proche du max de gardes par semaine
  if (gardesParSemaine >= maxGardesParSemaine - 1) {
    score -= 10;
  }

  // Respect des préférences
  if (prefMedecin.preferences[date]?.[creneau.id] === 'Oui') { score += 3; }
  else if (prefMedecin.preferences[date]?.[creneau.id] === 'Possible') { score += 1; }
  else if (prefMedecin.preferences[date]?.[creneau.id] === 'Non') { score -= 5; }

  // Nombre de gardes souhaitées
  const gardesDuMois = compterGardesMois(medecinId, planning, mois);
  if (gardesDuMois < prefMedecin.nombreGardesSouhaitees) { score += 2; }
  else { score -= (gardesDuMois - prefMedecin.nombreGardesSouhaitees) * 2; }

  // Gardes groupées
  if (prefMedecin.gardesGroupees && estWeekEnd(date) && aGardeWeekEnd(medecinId, date, planning)) {
    score += 2;
  }

  // Renforts associés
  if (prefMedecin.renfortsAssocies) {
    if (creneau.id.startsWith('RENFORT') && aGardeJour(medecinId, date, planning)) { score += 2; }
    if (!creneau.id.startsWith('RENFORT') && aRenfortJour(medecinId, date, planning)) { score += 2; }
  }

  return score;
};

const compterGardesMois = (medecinId, planning, mois) => {
  return Object.entries(planning).reduce((count, [date, creneauxJour]) => {
    if (new Date(date).getMonth() === mois) {
      return count + Object.values(creneauxJour).flat().filter(m => m === medecinId).length;
    }
    return count;
  }, 0);
};

const estWeekEnd = (date) => {
  const jour = new Date(date).getDay();
  return jour === 0 || jour === 6;
};

const aGardeWeekEnd = (medecinId, date, planning) => {
  const dateObj = new Date(date);
  const debutWeekEnd = new Date(dateObj.setDate(dateObj.getDate() - dateObj.getDay()));
  const finWeekEnd = new Date(dateObj.setDate(dateObj.getDate() - dateObj.getDay() + 6));

  for (let d = new Date(debutWeekEnd); d <= finWeekEnd; d.setDate(d.getDate() + 1)) {
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

const rechercheTabou = (planning, debut, fin, desiderata, medecins, maxIterations = 1000) => {
  let meilleurPlanning = planning;
  let meilleurScore = evaluerPlanning(planning, desiderata);
  const listeTabou = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const voisins = genererVoisins(meilleurPlanning, medecins, desiderata);
    let meilleurVoisin = null;
    let meilleurScoreVoisin = -Infinity;

    for (const voisin of voisins) {
      const scoreVoisin = evaluerPlanning(voisin, desiderata);
      if (scoreVoisin > meilleurScoreVoisin && !listeTabou.has(JSON.stringify(voisin))) {
        meilleurVoisin = voisin;
        meilleurScoreVoisin = scoreVoisin;
      }
    }

    if (meilleurScoreVoisin > meilleurScore) {
      meilleurPlanning = meilleurVoisin;
      meilleurScore = meilleurScoreVoisin;
      listeTabou.add(JSON.stringify(meilleurVoisin));
      if (listeTabou.size > 50) {
        listeTabou.delete(listeTabou.values().next().value);
      }
    }
  }

  return meilleurPlanning;
};

const genererVoisins = (planning, medecins, desiderata) => {
  const voisins = [];
  const dates = Object.keys(planning);
  const date = dates[Math.floor(Math.random() * dates.length)];
  const creneauId = Object.keys(planning[date])[Math.floor(Math.random() * Object.keys(planning[date]).length)];
  const index = Math.floor(Math.random() * planning[date][creneauId].length);

  for (const medecin of medecins) {
    if (!planning[date][creneauId].includes(medecin)) {
      const nouveauPlanning = JSON.parse(JSON.stringify(planning));
      nouveauPlanning[date][creneauId][index] = medecin;

      // Vérifier si le changement respecte toutes les contraintes
      const gardesParSemaine = compterGardesParSemaine(medecin, date, nouveauPlanning);
      const maxGardes = desiderata[medecin]?.nombreGardesMaxParSemaine || 7;
      const aChevauchement = aCreneauxChevauchants(medecin, date, creneauId, nouveauPlanning);
      if (gardesParSemaine <= maxGardes && !aChevauchement && verifierContraintes(nouveauPlanning)) {
        voisins.push(nouveauPlanning);
      }
    }
  }

  const planningRetrait = JSON.parse(JSON.stringify(planning));
  planningRetrait[date][creneauId][index] = null;
  if (verifierContraintes(planningRetrait)) {
    voisins.push(planningRetrait);
  }

  return voisins;
};

export const evaluerPlanning = (planning, desiderata) => {
  let score = 0;
  const gardesParMedecin = {};
  const gardesParMedecinParSemaine = {};

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

        if (!gardesParMedecin[medecinId]) { gardesParMedecin[medecinId] = 0; }
        gardesParMedecin[medecinId]++;

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

  // Évaluation du nombre de gardes souhaitées par mois
  for (const medecinId in gardesParMedecin) {
    const diff = Math.abs(gardesParMedecin[medecinId] - desiderata[medecinId]?.nombreGardesSouhaitees);
    score -= diff * 2;
  }

  return score;
};

export const verifierContraintes = (planning) => {
  const dates = Object.keys(planning).sort();
  const gardesParMedecinParSemaine = {};

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const medecinsDuJour = new Set();

    // Vérifier les chevauchements de créneaux
    for (const creneauId in planning[date]) {
      const medecins = planning[date][creneauId];
      for (const medecinId of medecins) {
        if (medecinId === null) { continue; }

        if (aCreneauxChevauchants(medecinId, date, creneauId, planning)) {
          return false;
        }

        medecinsDuJour.add(medecinId);
      }
    }

    // Vérifier les gardes consécutives
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

      // Vérifier le nombre de gardes par semaine
      const semaine = getWeekNumber(date);
      if (!gardesParMedecinParSemaine[medecinId]) {
        gardesParMedecinParSemaine[medecinId] = {};
      }
      if (!gardesParMedecinParSemaine[medecinId][semaine]) {
        gardesParMedecinParSemaine[medecinId][semaine] = 0;
      }
      gardesParMedecinParSemaine[medecinId][semaine]++;
    }
  }

  // Vérifier le respect du nombre maximum de gardes par semaine
  for (const medecinId in gardesParMedecinParSemaine) {
    for (const semaine in gardesParMedecinParSemaine[medecinId]) {
      const maxGardesParSemaine = 7;  // Valeur par défaut
      if (gardesParMedecinParSemaine[medecinId][semaine] > maxGardesParSemaine) {
        return false;
      }
    }
  }

  return true;
};

// Entrée pure « classique » : solution gloutonne puis recherche tabou.
export const computeClassique = (debut, fin, desiderata, medecins) => {
  let planning = genererPlanningSolution(debut, fin, desiderata, medecins);
  planning = rechercheTabou(planning, debut, fin, desiderata, medecins);
  return planning;
};

// ============================================================================
// Génération « par ordre de priorité »
// ============================================================================

const attribuerCreneauxParPreference = (
  medecinId, dateString, preferenceType, nombreGardesSouhaitees, maxGardesParSemaine,
  desiderata, planning, gardesAttribuees
) => {
  // Respect strict du quota demandé
  if (gardesAttribuees[medecinId] >= nombreGardesSouhaitees) {
    return; // Quota atteint
  }

  const gardesParSemaine = compterGardesParSemaine(medecinId, dateString, planning);
  if (gardesParSemaine >= maxGardesParSemaine) {
    return; // Limite hebdomadaire atteinte
  }

  const preferencesJour = desiderata[medecinId].preferences[dateString] || {};

  // Parcourir tous les créneaux pour cette préférence
  for (const creneau of creneaux) {
    // Vérifier à nouveau le quota à chaque attribution
    if (gardesAttribuees[medecinId] >= nombreGardesSouhaitees) {
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
      gardesAttribuees[medecinId]++;
    }
  }
};

const remplirCreneauxVidesAvecDisponibles = (dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning) => {
  // Parcourir tous les créneaux pour trouver les places vides
  for (const creneau of creneaux) {
    if (!planning[dateString][creneau.id]) {
      continue;
    }

    const placesVides = planning[dateString][creneau.id]
      .map((medecin, index) => medecin === null ? index : -1)
      .filter(index => index !== -1);

    // S'il y a des places vides, essayer de les remplir
    for (const indexVide of placesVides) {
      // Parcourir tous les médecins dans l'ordre de priorité
      for (const nomMedecin of ordrePriorite) {
        const medecinId = mapMedecinNomVersId[nomMedecin];
        if (!medecinId || !desiderata[medecinId]) {
          continue;
        }

        const preference = desiderata[medecinId].preferences[dateString]?.[creneau.id];

        // SEULEMENT "Oui" ou "Possible" - jamais "Non"
        if (preference !== 'Oui' && preference !== 'Possible') {
          continue;
        }

        // Vérifications de base
        const maxGardesParSemaine = desiderata[medecinId].nombreGardesMaxParSemaine || 7;
        const gardesParSemaine = compterGardesParSemaine(medecinId, dateString, planning);

        // Vérifier si le médecin peut prendre cette garde
        if (gardesParSemaine >= maxGardesParSemaine) {
          continue;
        }
        if (aCreneauxChevauchants(medecinId, dateString, creneau.id, planning)) {
          continue;
        }

        // Vérifier qu'il n'est pas déjà assigné ce jour-là
        const dejaAssigneAujourdhui = Object.values(planning[dateString]).some(medecins =>
          medecins.includes(medecinId)
        );

        if (!dejaAssigneAujourdhui) {
          planning[dateString][creneau.id][indexVide] = medecinId;
          logger.info(`Fallback: ${nomMedecin} assigné à ${creneau.id} le ${dateString} (préférence: ${preference})`);
          break; // Passer à la place vide suivante
        }
      }
    }
  }
};

export const diviserPeriode = (debut, fin) => {
  const startDate = new Date(debut);
  const endDate = new Date(fin);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const premierTourDays = Math.min(45, Math.floor(totalDays / 2));
  const deuxiemeTourStart = new Date(startDate);
  deuxiemeTourStart.setDate(deuxiemeTourStart.getDate() + premierTourDays);

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

const genererPlanningPourPeriode = (debut, fin, ordrePriorite, mapMedecinNomVersId, desiderata) => {
  const planning = {};
  const currentDate = new Date(debut);
  const endDate = new Date(fin);

  // Compteur de gardes attribuées par médecin
  const gardesAttribuees = {};
  ordrePriorite.forEach(nomMedecin => {
    const medecinId = mapMedecinNomVersId[nomMedecin];
    if (medecinId) {
      gardesAttribuees[medecinId] = 0;
    }
  });

  // Générer jour par jour
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    planning[dateString] = {};

    // Initialiser tous les créneaux pour ce jour
    creneaux.forEach(creneau => {
      if (!creneau.samediOnly || currentDate.getDay() === 6) {
        planning[dateString][creneau.id] = Array(creneau.medecins).fill(null);
      }
    });

    // Attribution séquentielle complète par ordre de priorité
    for (const nomMedecin of ordrePriorite) {
      const medecinId = mapMedecinNomVersId[nomMedecin];
      if (!medecinId || !desiderata[medecinId]) {
        continue;
      }

      const nombreGardesSouhaitees = desiderata[medecinId].nombreGardesSouhaitees || 0;
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
    remplirCreneauxVidesAvecDisponibles(dateString, ordrePriorite, mapMedecinNomVersId, desiderata, planning);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Debug : vérifier la répartition des gardes
  logger.info('Répartition des gardes attribuées:', gardesAttribuees);

  // Compter les créneaux vides
  let creneauxVides = 0;
  let creneauxTotal = 0;
  Object.values(planning).forEach(joursCreneaux => {
    Object.values(joursCreneaux).forEach(medecins => {
      medecins.forEach(medecin => {
        creneauxTotal++;
        if (medecin === null) {
          creneauxVides++;
        }
      });
    });
  });

  logger.info(`Créneaux non pourvus: ${creneauxVides}/${creneauxTotal}`);

  return planning;
};

// Entrée pure « priorité » : division en deux tours puis attribution séquentielle.
export const computePriorite = (debut, fin, desiderata, mapMedecinNomVersId, listePriorite) => {
  const periodes = diviserPeriode(debut, fin);

  const planningPremierTour = genererPlanningPourPeriode(
    periodes.premierTour.debut,
    periodes.premierTour.fin,
    listePriorite.premierTour,
    mapMedecinNomVersId,
    desiderata
  );

  const planningDeuxiemeTour = genererPlanningPourPeriode(
    periodes.deuxiemeTour.debut,
    periodes.deuxiemeTour.fin,
    listePriorite.deuxiemeTour,
    mapMedecinNomVersId,
    desiderata
  );

  return { ...planningPremierTour, ...planningDeuxiemeTour };
};
