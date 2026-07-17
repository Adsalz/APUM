// src/utils/planningGeneratorPriorite.js
import { getDesiderataForPeriod } from '../services/planningService';
import { getAllUsers } from '../services/userService';
import logger from './logger';

const creneaux = [
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

const aCreneauxChevauchants = (medecinId, date, creneauId, planning) => {
  if (!creneauxChevauchants[creneauId]) {
    return false;
  }

  const creneauxDuJour = planning[date];
  return creneauxChevauchants[creneauId].some(creneauChevauchant =>
    creneauxDuJour[creneauChevauchant]?.includes(medecinId)
  );
};

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const compterGardesParSemaine = (medecinId, date, planning) => {
  const weekNumber = getWeekNumber(date);
  let count = 0;

  Object.entries(planning).forEach(([planningDate, creneaux]) => {
    if (getWeekNumber(planningDate) === weekNumber) {
      Object.values(creneaux).forEach(medecins => {
        if (medecins && medecins.includes(medecinId)) {
          count++;
        }
      });
    }
  });

  return count;
};

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

const diviserPeriode = (debut, fin) => {
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

const genererPlanningPriorite = async (debut, fin, listePriorite) => {
  try {
    logger.info('Génération du planning par ordre de priorité', { debut, fin, listePriorite });

    const desiderataData = await getDesiderataForPeriod(debut, fin);
    const users = await getAllUsers();
    const medecins = users.filter(user => user.role === 'medecin');

    // Créer le mapping des desiderata
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
      Object.entries(d.desiderata).forEach(([date, creneaux]) => {
        const formattedDate = new Date(date).toISOString().split('T')[0];
        if (!desiderata[d.userId].preferences[formattedDate]) {
          desiderata[d.userId].preferences[formattedDate] = {};
        }
        Object.assign(desiderata[d.userId].preferences[formattedDate], creneaux);
      });
    });

    // Diviser la période
    const periodes = diviserPeriode(debut, fin);
    logger.info('Périodes divisées', periodes);

    // Créer l'ordre de priorité pour chaque tour
    const ordrePremierTour = listePriorite.premierTour;
    const ordreDeuxiemeTour = listePriorite.deuxiemeTour;

    // Mapper les noms aux IDs des médecins
    const mapMedecinNomVersId = {};
    medecins.forEach(medecin => {
      const nomComplet = `${medecin.nom} ${medecin.prenom}`;
      mapMedecinNomVersId[nomComplet] = medecin.id;
    });

    // Générer le planning pour le premier tour
    const planningPremierTour = genererPlanningPourPeriode(
      periodes.premierTour.debut,
      periodes.premierTour.fin,
      ordrePremierTour,
      mapMedecinNomVersId,
      desiderata
    );

    // Générer le planning pour le deuxième tour
    const planningDeuxiemeTour = genererPlanningPourPeriode(
      periodes.deuxiemeTour.debut,
      periodes.deuxiemeTour.fin,
      ordreDeuxiemeTour,
      mapMedecinNomVersId,
      desiderata
    );

    // Combiner les deux plannings
    const planningFinal = { ...planningPremierTour, ...planningDeuxiemeTour };

    logger.info('Planning généré avec succès', {
      totalDates: Object.keys(planningFinal).length,
      premierTourDates: Object.keys(planningPremierTour).length,
      deuxiemeTourDates: Object.keys(planningDeuxiemeTour).length
    });

    return planningFinal;
  } catch (error) {
    logger.error('Erreur lors de la génération du planning par priorité:', error);
    throw error;
  }
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

export { genererPlanningPriorite, creneaux, diviserPeriode };