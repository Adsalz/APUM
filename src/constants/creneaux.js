// src/constants/creneaux.js
// Source unique de vérité des créneaux de garde pour la couche d'affichage
// (formulaires de desiderata, visualisation du planning).
//
// ORDRE CANONIQUE (demande admin, aligné sur la fiche desiderata papier
// « DESIDERATA ASO26 ») : le RENFORT 20h/00h vient APRÈS le 4ème quart.
// Les teintes `chip` reprennent les couleurs des tableaux de garde de
// référence (« TABLEAUX MOIS PAR MOIS ») : bleu 1er quart, jaune 2ème,
// rose renforts, vert 3ème, gris 4ème.
//
// NB : les générateurs de planning (src/utils/planningCore.js) conservent leur
// propre copie, car leur `label` est historiquement différent. Toute évolution
// des créneaux (ids, ordre, nombre de médecins, `samediOnly`) doit être
// répercutée ici ET là-bas tant qu'ils ne sont pas unifiés.

export const CRENEAUX = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2, chip: 'bg-blue-100 text-blue-800 ring-blue-200' },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3, chip: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true, chip: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200' },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3, chip: 'bg-green-100 text-green-800 ring-green-200' },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3, chip: 'bg-neutral-200 text-neutral-700 ring-neutral-300' },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1, chip: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200' },
];

// Choix de disponibilité proposés dans les grilles de desiderata.
export const CHOIX_DISPONIBILITE = ['Oui', 'Possible', 'Non'];

export default CRENEAUX;
