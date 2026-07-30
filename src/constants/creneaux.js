// src/constants/creneaux.js
// Source unique de vérité des créneaux de garde pour la couche d'affichage
// (formulaires de desiderata, visualisation du planning).
//
// ORDRE CANONIQUE (demande admin, aligné sur la fiche desiderata papier
// « DESIDERATA ASO26 ») : le RENFORT 20h/00h vient APRÈS le 4ème quart.
// Les teintes `chip` reprennent les couleurs EXACTES des exports Excel :
// bleu B4C6E7 1er quart, jaune FFE699 2ème, rose FF99FF renforts,
// vert C6E0B4 3ème, gris D9D9D9 4ème.
//
// NB : les générateurs de planning (src/utils/planningCore.js) conservent leur
// propre copie, car leur `label` est historiquement différent. Toute évolution
// des créneaux (ids, ordre, nombre de médecins, `samediOnly`) doit être
// répercutée ici ET là-bas tant qu'ils ne sont pas unifiés.

export const CRENEAUX = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2, chip: 'bg-[#B4C6E7] text-ink-900 ring-ink-900/10' },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3, chip: 'bg-[#FFE699] text-ink-900 ring-ink-900/10' },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true, chip: 'bg-[#FF99FF] text-ink-900 ring-ink-900/10' },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3, chip: 'bg-[#C6E0B4] text-ink-900 ring-ink-900/10' },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3, chip: 'bg-[#D9D9D9] text-ink-900 ring-ink-900/10' },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1, chip: 'bg-[#FF99FF] text-ink-900 ring-ink-900/10' },
];

// Choix de disponibilité proposés dans les grilles de desiderata.
export const CHOIX_DISPONIBILITE = ['Oui', 'Possible', 'Non'];

export default CRENEAUX;
