// src/constants/creneaux.js
// Source unique de vérité des créneaux de garde pour la couche d'affichage
// (formulaires de desiderata, visualisation du planning).
//
// NB : les générateurs de planning (src/utils/planningGenerator.js et
// planningGeneratorPriorite.js) conservent pour l'instant leur propre copie,
// car leur `label` est historiquement différent. Toute évolution des créneaux
// (ids, nombre de médecins, `samediOnly`) doit être répercutée ici ET dans ces
// deux fichiers tant qu'ils ne sont pas unifiés.

export const CRENEAUX = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2, chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3, chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true, chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3, chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1, chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3, chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
];

// Choix de disponibilité proposés dans les grilles de desiderata.
export const CHOIX_DISPONIBILITE = ['Oui', 'Possible', 'Non'];

export default CRENEAUX;
