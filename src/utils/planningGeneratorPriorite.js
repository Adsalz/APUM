// src/utils/planningGeneratorPriorite.js
// Couche I/O de la génération « par ordre de priorité » : récupère les données
// (Firebase), prépare le mapping nom→id, puis délègue le calcul pur au Web
// Worker (planningCore.js / runPlanningWorker.js).
import { getDesiderataForPeriod } from '../services/planningService';
import { getAllUsers } from '../services/userService';
import logger from './logger';
import { creneaux, diviserPeriode, buildDesiderataMap } from './planningCore';

const genererPlanningPriorite = async (debut, fin, listePriorite) => {
  try {
    logger.info('Génération du planning par ordre de priorité', { debut, fin, listePriorite });

    const desiderataData = await getDesiderataForPeriod(debut, fin);
    const users = await getAllUsers();
    const medecins = users.filter((user) => user.role === 'medecin');
    const desiderata = buildDesiderataMap(desiderataData);

    // Mapper les noms complets (« Nom Prénom ») aux IDs des médecins.
    const mapMedecinNomVersId = {};
    medecins.forEach((medecin) => {
      const nomComplet = `${medecin.nom} ${medecin.prenom}`;
      mapMedecinNomVersId[nomComplet] = medecin.id;
    });

    const { default: runPlanningWorker } = await import('./runPlanningWorker');
    const planningFinal = await runPlanningWorker({
      mode: 'priorite',
      debut,
      fin,
      desiderata,
      mapMedecinNomVersId,
      listePriorite,
    });

    logger.info('Planning généré avec succès', {
      totalDates: Object.keys(planningFinal).length,
    });
    return planningFinal;
  } catch (error) {
    logger.error('Erreur lors de la génération du planning par priorité:', error);
    throw error;
  }
};

export { genererPlanningPriorite, creneaux, diviserPeriode };
