// src/workers/planning.worker.js
// Web Worker : exécute le calcul (lourd) de génération de planning hors du
// thread principal pour ne pas geler l'interface. Ne reçoit que des données
// pures (aucun accès Firebase ici).
import { computeClassique, computePriorite } from '../utils/planningCore';

// eslint-disable-next-line no-restricted-globals
self.onmessage = (e) => {
  const { mode, debut, fin, desiderata, medecins, mapMedecinNomVersId, listePriorite } = e.data || {};
  try {
    const planning =
      mode === 'priorite'
        ? computePriorite(debut, fin, desiderata, mapMedecinNomVersId, listePriorite)
        : computeClassique(debut, fin, desiderata, medecins);
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ ok: true, planning });
  } catch (err) {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ ok: false, error: (err && err.message) || String(err) });
  }
};
