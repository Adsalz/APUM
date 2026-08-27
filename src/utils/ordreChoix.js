// src/utils/ordreChoix.js
// Règle d'évolution de l'ordre de choix APUM. À partir du PREMIER TOUR de la
// période précédente :
//   1. retirer les médecins partis ;
//   2. faire basculer les N (=10) premiers EN BAS (même ordre) ;
//   3. placer les nouveaux médecins EN FIN DE LISTE, après ce bloc de N ;
//   4. deuxième tour = premier tour inversé.
//
//   nouveau_premier = gardés.slice(N) + gardés.slice(0, N) + nouveaux
//
// ── D'où vient N = 10 ───────────────────────────────────────────────────────
// Décodé sur les 12 listes officielles de février 2023 à avril 2026. N=10 tient
// sur toutes les transitions entre trimestres CONSÉCUTIFS. Les deux transitions
// qui semblaient réclamer N=17 et N=20 sautent en fait un trimestre absent de la
// collection (ASO23, ASO25) : ce sont deux rotations de 10, pas une autre valeur.
//
// ── Où vont les nouveaux : un choix, pas une déduction ──────────────────────
// L'historique n'est PAS univoque. Sur les cinq transitions consécutives qui
// comportent des arrivées, quatre placent les nouveaux juste AVANT le bloc de 10
// (nov 23, août 24, nov 24, nov 25) et une les place TOUT EN BAS (mai→août 2024,
// LEROY-STEFANI et FRISON aux rangs 52-53 sur 53).
// Décision d'Adrien (août 2026), qui tranche pour la pratique en vigueur : les
// nouveaux arrivent EN FIN DE LISTE. Ne pas « corriger » ce comportement au vu
// de la majorité historique — c'est un arbitrage métier, pas un bug.
//
// Le résultat reste une PROPOSITION que l'admin réordonne avant de figer.

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
  const premierTour = [...reste, ...tete, ...nouveaux];

  return { premierTour, deuxiemeTour: [...premierTour].reverse(), nouveaux, partis };
};
