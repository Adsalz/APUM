// src/workers/planning.worker.js
// Web Worker : exécute le calcul (lourd) de génération de planning hors du
// thread principal pour ne pas geler l'interface. Ne reçoit que des données
// pures (aucun accès Firebase ici).
import { computePriorite } from '../utils/planningCore';

// eslint-disable-next-line no-restricted-globals
self.onmessage = (e) => {
  const { debut, fin, desiderata, listePriorite } = e.data || {};
  try {
    const planning = computePriorite(debut, fin, desiderata, listePriorite);
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ ok: true, planning });
  } catch (err) {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ ok: false, error: (err && err.message) || String(err) });
  }
};
