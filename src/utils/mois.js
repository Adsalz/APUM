// src/utils/mois.js
// Libellés de mois partagés par les grilles (planning, desiderata) pour les
// bandeaux de séparation entre les mois.

export const MOIS_LONGS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// 'YYYY-MM' (ou 'YYYY-MM-DD') → « Juillet 2026 ». Travaille sur la clé texte,
// donc insensible au fuseau horaire.
export const libelleMoisAnnee = (moisKey) => {
  const [annee, mois] = moisKey.split('-').map(Number);
  return `${MOIS_LONGS[mois - 1]} ${annee}`;
};
