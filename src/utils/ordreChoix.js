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
// ── L'ordre est une suite d'IDENTIFIANTS, jamais de noms ────────────────────
// Une liste de noms se rompt au premier renommage : le médecin renommé sort de
// la liste comme « parti » et y rentre comme « nouveau », silencieusement.
// C'est arrivé en production le 2026-08-26 (ZWANEVELD Nicole et BENOIT Grégoire
// remontés parmi les arrivants après correction de leur fiche). L'identifiant
// Firebase, lui, ne bouge pas. Les noms ne servent plus qu'à l'affichage.
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

// precedentIds : premier tour du trimestre précédent (identifiants).
// idsActuels   : identifiants des médecins actuellement en poste.
// nomParId     : Map|objet id → « Nom Prénom », utilisé UNIQUEMENT pour trier la
//                toute première liste (aucun précédent) de façon reproductible.
export const genererProchainOrdreChoix = (precedentIds, idsActuels, nomParId = null, N = N_BASCULE) => {
  const actuels = Array.isArray(idsActuels) ? idsActuels : [];
  const nomDe = (id) => {
    if (!nomParId) { return ''; }
    return (typeof nomParId.get === 'function' ? nomParId.get(id) : nomParId[id]) || '';
  };

  // Pas de liste précédente : on part d'un ordre alphabétique reproductible.
  if (!precedentIds || precedentIds.length === 0) {
    const premierTour = [...actuels].sort((a, b) => nomDe(a).localeCompare(nomDe(b)));
    return { premierTour, deuxiemeTour: [...premierTour].reverse(), nouveaux: [...premierTour], partis: [] };
  }

  const ensembleActuels = new Set(actuels);
  const ensemblePrecedent = new Set(precedentIds);

  const partis = precedentIds.filter((id) => !ensembleActuels.has(id));
  const gardes = precedentIds.filter((id) => ensembleActuels.has(id));
  const nouveaux = actuels.filter((id) => !ensemblePrecedent.has(id));

  const tete = gardes.slice(0, N);
  const reste = gardes.slice(N);
  const premierTour = [...reste, ...tete, ...nouveaux];

  return { premierTour, deuxiemeTour: [...premierTour].reverse(), nouveaux, partis };
};

// Lecture d'un document d'ordre de choix stocké → suite d'IDENTIFIANTS.
//
// Compatibilité ascendante : les documents écrits avant le passage aux
// identifiants ne portent que des noms. On les résout alors contre l'annuaire
// courant, à l'identique (`Nom Prénom`), et on signale ce qui n'a pas pu l'être
// — c'est exactement le point de rupture que les identifiants suppriment, donc
// il doit être VISIBLE, pas silencieux.
export const idsDeLOrdre = (document, medecins = []) => {
  if (!document) { return { premierTourIds: [], deuxiemeTourIds: [], nonResolus: [], migre: true }; }

  if (Array.isArray(document.premierTourIds) && document.premierTourIds.length > 0) {
    return {
      premierTourIds: document.premierTourIds,
      deuxiemeTourIds: document.deuxiemeTourIds?.length
        ? document.deuxiemeTourIds
        : [...document.premierTourIds].reverse(),
      nonResolus: [],
      migre: true,
    };
  }

  const idParNom = new Map(medecins.map((m) => [`${m.nom} ${m.prenom}`.trim(), m.id]));
  const noms = Array.isArray(document.premierTour) ? document.premierTour : [];
  const nonResolus = noms.filter((nom) => !idParNom.has(nom));
  const premierTourIds = noms.map((nom) => idParNom.get(nom)).filter(Boolean);

  return {
    premierTourIds,
    deuxiemeTourIds: [...premierTourIds].reverse(),
    nonResolus,
    migre: false,
  };
};
