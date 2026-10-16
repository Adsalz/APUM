// src/utils/suiviDesiderata.js
// Lignes du tableau de suivi des desiderata (écran admin) : statut de chaque
// médecin et tri par colonne. Logique pure, sans React ni Firebase.
import { libelleModification } from './modificationDesiderata';

// Ordre de gravité : au tri croissant, les fiches à relancer remontent.
export const STATUTS = {
  non_saisi: { rang: 0, tone: 'danger', texte: 'Non saisi' },
  incomplet: { rang: 1, tone: 'warning', texte: 'Incomplet' },
  complet: { rang: 2, tone: 'success', texte: 'Complet' },
};

// Une fiche jamais modifiée n'a pas de date : elle reste en bas du tableau,
// que le tri soit croissant ou décroissant.
export const SANS_DATE = -Infinity;

export const statutDeLaFiche = (fiche) => {
  if (!fiche) { return 'non_saisi'; }
  return Object.keys(fiche.desiderata || {}).length === 0 ? 'incomplet' : 'complet';
};

const comparerTexte = (a, b) =>
  (a || '').toString().localeCompare((b || '').toString(), 'fr', { sensitivity: 'base' });

const comparerNom = (a, b) =>
  comparerTexte(a.medecin.nom, b.medecin.nom) || comparerTexte(a.medecin.prenom, b.medecin.prenom);

// Les colonnes triables. `comparer` donne l'ordre croissant sur la seule valeur
// de la colonne : le départage par nom, lui, reste alphabétique dans les deux
// sens (voir `trierLignes`). `sensDefaut` est le sens du premier clic — une
// date part du plus récent.
export const COLONNES = [
  {
    cle: 'medecin',
    libelle: 'Médecin',
    sensDefaut: 'asc',
    comparer: comparerNom,
  },
  {
    cle: 'email',
    libelle: 'Email',
    sensDefaut: 'asc',
    comparer: (a, b) => comparerTexte(a.medecin.email, b.medecin.email),
  },
  {
    cle: 'statut',
    libelle: 'Statut',
    sensDefaut: 'asc',
    comparer: (a, b) => STATUTS[a.statut].rang - STATUTS[b.statut].rang,
  },
  {
    cle: 'modification',
    libelle: 'Dernière modification',
    sensDefaut: 'desc',
    comparer: (a, b) => a.modifieLe - b.modifieLe,
  },
];

export const colonneParCle = (cle) => COLONNES.find(colonne => colonne.cle === cle) || COLONNES[0];

/** Une ligne de tableau par médecin, fiche de desiderata rattachée. */
export const construireLignes = (medecins, desiderata) => {
  const fiches = new Map((desiderata || []).map(fiche => [fiche.userId, fiche]));

  return (medecins || []).map(medecin => {
    const fiche = fiches.get(medecin.id);
    const instant = fiche?.modifieLe ? new Date(fiche.modifieLe).getTime() : NaN;
    return {
      medecin,
      statut: statutDeLaFiche(fiche),
      modification: libelleModification(fiche),
      modifieLe: Number.isNaN(instant) ? SANS_DATE : instant,
    };
  });
};

/** Nouvelle liste triée sur une colonne, départage alphabétique dans les deux sens. */
export const trierLignes = (lignes, colonne, sens) => {
  const facteur = sens === 'desc' ? -1 : 1;

  return [...(lignes || [])].sort((a, b) => {
    if (colonne.cle === 'modification' && (a.modifieLe === SANS_DATE || b.modifieLe === SANS_DATE)) {
      if (a.modifieLe === b.modifieLe) { return comparerNom(a, b); }
      return a.modifieLe === SANS_DATE ? 1 : -1;
    }
    return facteur * colonne.comparer(a, b) || comparerNom(a, b);
  });
};

/** Sens à appliquer au clic sur l'en-tête d'une colonne. */
export const triSuivant = (triCourant, colonne) =>
  triCourant.cle === colonne.cle
    ? { cle: colonne.cle, sens: triCourant.sens === 'asc' ? 'desc' : 'asc' }
    : { cle: colonne.cle, sens: colonne.sensDefaut };
