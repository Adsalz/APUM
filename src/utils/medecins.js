// src/utils/medecins.js
// Tri alphabétique partagé des listes de médecins (nom puis prénom, règles
// françaises : accents et casse ignorés). Renvoie une NOUVELLE liste.

export const trierMedecinsParNom = (medecins) =>
  [...(medecins || [])].sort((a, b) =>
    (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }) ||
    (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' })
  );

// Une fiche de desiderata renvoyée par un médecin porte un nom écrit à la main :
// on peut y lire « DURAND Anne », « Dr Anne Durand » ou « a. durand ». Avant
// d'importer, on vérifie seulement que le nom de famille du médecin choisi y
// figure — assez pour attraper la fiche de quelqu'un d'autre, assez tolérant
// pour ne pas crier sur une graphie inhabituelle.
const sansAccents = (texte) =>
  (texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const nomFicheCorrespond = (nomLu, medecin) => {
  // Fiche laissée anonyme (le modèle vierge) : rien à vérifier.
  if (!nomLu || !medecin?.nom) { return true; }
  return sansAccents(nomLu).includes(sansAccents(medecin.nom));
};
