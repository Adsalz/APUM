// src/utils/ordreChoix.js
// Règle d'évolution de l'ordre de choix APUM, décodée et vérifiée sur les listes
// réelles (mai 2024 → août 2026). À partir du PREMIER TOUR de la période
// précédente :
//   1. retirer les médecins partis ;
//   2. faire basculer les N (=10) premiers EN BAS (même ordre) ;
//   3. insérer les nouveaux médecins JUSTE AVANT ce bloc de N ;
//   4. deuxième tour = premier tour inversé.
//
//   nouveau_premier = gardés.slice(N) + nouveaux + gardés.slice(0, N)
//
// La règle reproduit exactement 5 transitions sur 7 ; les 2 autres ne dévient que
// d'UNE retouche manuelle de la coordinatrice. Le résultat est donc une
// PROPOSITION que l'admin peut réordonner avant de valider.

export const N_BASCULE = 10;

// nomsActuels : liste des médecins actuels au format « Nom Prénom » (identique à
// ce que consomme genererPlanningPriorite via mapMedecinNomVersId).
export const genererProchainOrdreChoix = (precedentPremierTour, nomsActuels, N = N_BASCULE) => {
  const actuels = Array.isArray(nomsActuels) ? nomsActuels : [];

  // Pas de liste précédente : on part d'un ordre alphabétique reproductible.
  if (!precedentPremierTour || precedentPremierTour.length === 0) {
    const premierTour = [...actuels].sort((a, b) => a.localeCompare(b));
    return { premierTour, deuxiemeTour: [...premierTour].reverse(), nouveaux: [...premierTour], partis: [] };
  }

  const ensembleActuels = new Set(actuels);
  const ensemblePrecedent = new Set(precedentPremierTour);

  const partis = precedentPremierTour.filter((nom) => !ensembleActuels.has(nom));
  const gardes = precedentPremierTour.filter((nom) => ensembleActuels.has(nom));
  const nouveaux = actuels.filter((nom) => !ensemblePrecedent.has(nom));

  const tete = gardes.slice(0, N);
  const reste = gardes.slice(N);
  const premierTour = [...reste, ...nouveaux, ...tete];

  return { premierTour, deuxiemeTour: [...premierTour].reverse(), nouveaux, partis };
};
