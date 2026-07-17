// src/utils/planningGenerator.js
// Couche I/O de la génération « classique » : récupère les données (Firebase)
// puis délègue le calcul pur (lourd) à un Web Worker (voir planningCore.js /
// runPlanningWorker.js). Les helpers purs sont ré-exportés depuis planningCore
// pour compatibilité (tests, autres modules).
import { getDesiderataForPeriod } from '../services/planningService';
import { getAllUsers } from '../services/userService';
import logger from './logger';
import {
  creneaux,
  getWeekNumber,
  aCreneauxChevauchants,
  compterGardesParSemaine,
  verifierContraintes,
  evaluerPlanning,
  buildDesiderataMap,
} from './planningCore';

const genererPlanning = async (debut, fin) => {
  try {
    const desiderataData = await getDesiderataForPeriod(debut, fin);
    const users = await getAllUsers();
    const medecins = users.filter((user) => user.role === 'medecin').map((user) => user.id);
    const desiderata = buildDesiderataMap(desiderataData);

    // Import dynamique : garde le worker (et import.meta) hors du bundle initial
    // et hors de l'environnement de test.
    const { default: runPlanningWorker } = await import('./runPlanningWorker');
    return await runPlanningWorker({ mode: 'classique', debut, fin, desiderata, medecins });
  } catch (error) {
    logger.error('Erreur lors de la génération du planning:', error);
    throw error;
  }
};

export {
  genererPlanning,
  creneaux,
  getWeekNumber,
  aCreneauxChevauchants,
  compterGardesParSemaine,
  verifierContraintes,
  evaluerPlanning,
};
