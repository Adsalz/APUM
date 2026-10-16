// src/utils/runPlanningWorker.js
// Lance le calcul de planning dans un Web Worker (thread séparé → l'UI ne gèle
// pas pendant la recherche tabou / l'attribution). Repli synchrone si les Web
// Workers ne sont pas disponibles ou si le worker échoue à démarrer.

async function computeSync(payload) {
  const { computePriorite } = await import('./planningCore');
  const { debut, fin, desiderata, listePriorite, reglages } = payload;
  return computePriorite(debut, fin, desiderata, listePriorite, reglages);
}

export default function runPlanningWorker(payload) {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      computeSync(payload).then(resolve, reject);
      return;
    }

    let worker;
    try {
      // Worker « module » : en dev, Vite le sert tel quel, avec ses imports ES,
      // qu'un worker classique refuse (seul le build l'empaquette).
      worker = new Worker(new URL('../workers/planning.worker.js', import.meta.url), { type: 'module' });
    } catch (e) {
      computeSync(payload).then(resolve, reject);
      return;
    }

    worker.onmessage = (e) => {
      const { ok, planning, error } = e.data || {};
      worker.terminate();
      if (ok) { resolve(planning); } else { reject(new Error(error || 'Échec de la génération')); }
    };

    worker.onerror = () => {
      worker.terminate();
      // Repli synchrone si le worker ne se charge/exécute pas.
      computeSync(payload).then(resolve, reject);
    };

    worker.postMessage(payload);
  });
}
