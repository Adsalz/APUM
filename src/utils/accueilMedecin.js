// src/utils/accueilMedecin.js
// Où atterrit un médecin quand il se connecte.
//
// Le médecin n'a pas de tableau de bord : à chaque connexion l'application le
// pose directement sur le seul écran qui le concerne à cet instant, plutôt que
// de lui demander de deviner laquelle de deux tuiles est d'actualité.
//
//   - trimestre à venir dont le planning n'est pas publié → saisie des desiderata
//   - dès qu'un planning est publié                       → consultation du planning
//
// `periode` est le document planning/periode_saisie : ses bornes sont celles du
// TRIMESTRE À PLANIFIER, et non d'une fenêtre de saisie (l'admin n'en définit
// pas). Tant que ce trimestre n'a pas commencé, on est donc en phase de recueil
// — même convention que le bandeau de la page de connexion.

export const ROUTE_DESIDERATA = '/formulaire-desirata';
export const ROUTE_PLANNING = '/planning-visualisation';

const toDate = (valeur) => {
  if (!valeur) { return null; }
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Le planning publié est-il celui du trimestre en préparation ? Test de
// chevauchement des bornes — même rapprochement que desiderata ↔ période, pour
// tolérer les retouches d'un jour ou deux sur les dates.
export const planningCouvrePeriode = (periode, planning) => {
  const debutPeriode = toDate(periode?.startDate);
  const finPeriode = toDate(periode?.endDate);
  const debutPlanning = toDate(planning?.startDate);
  const finPlanning = toDate(planning?.endDate);
  if (!debutPeriode || !finPeriode || !debutPlanning || !finPlanning) { return false; }
  return debutPlanning <= finPeriode && finPlanning >= debutPeriode;
};

// « On est en période de saisie » : le trimestre à planifier n'a pas commencé
// ET son planning n'est pas encore sorti. La publication ferme la saisie : une
// fois les gardes attribuées, ressaisir ses desiderata n'a plus d'effet.
export const saisieOuverte = (periode, planning, now = new Date()) => {
  const debut = toDate(periode?.startDate);
  if (!debut || now >= debut) { return false; }
  return !planningCouvrePeriode(periode, planning);
};

// Destination de la redirection à la connexion.
export const accueilMedecin = (periode, planning, now = new Date()) => {
  if (saisieOuverte(periode, planning, now)) { return ROUTE_DESIDERATA; }
  if (planning) { return ROUTE_PLANNING; }
  // Ni saisie ouverte ni planning publié (période non définie, ou trimestre en
  // cours sans planning) : le formulaire est le seul écran qui ait du contenu,
  // et il sait dire lui-même ce qui manque.
  return ROUTE_DESIDERATA;
};
