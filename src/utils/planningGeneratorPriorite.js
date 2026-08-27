// src/utils/planningGeneratorPriorite.js
// Couche I/O de la génération « par ordre de priorité » : récupère les données
// (Firebase) puis délègue le calcul pur au Web Worker (planningCore.js /
// runPlanningWorker.js).
import { getDesiderataForPeriod } from '../services/planningService';
import logger from './logger';
import { creneaux, diviserPeriode, buildDesiderataMap } from './planningCore';

// listePriorite : { premierTourIds, deuxiemeTourIds } — des IDENTIFIANTS de
// médecins. Il n'y a plus de table nom → id à construire ici : l'ordre de choix
// stocke directement les identifiants, donc renommer une fiche ne peut plus
// faire disparaître quelqu'un du tour de garde.
const genererPlanningPriorite = async (debut, fin, listePriorite) => {
  try {
    logger.info('Génération du planning par ordre de priorité', { debut, fin, listePriorite });

    if (!listePriorite?.premierTourIds?.length || !listePriorite?.deuxiemeTourIds?.length) {
      throw new Error('Ordre de choix invalide : identifiants des deux tours attendus');
    }

    const desiderataData = await getDesiderataForPeriod(debut, fin);
    const desiderata = buildDesiderataMap(desiderataData);

    const { default: runPlanningWorker } = await import('./runPlanningWorker');
    const planningFinal = await runPlanningWorker({
      mode: 'priorite',
      debut,
      fin,
      desiderata,
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
