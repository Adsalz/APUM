// src/utils/medecins.js
// Tri alphabétique partagé des listes de médecins (nom puis prénom, règles
// françaises : accents et casse ignorés). Renvoie une NOUVELLE liste.

export const trierMedecinsParNom = (medecins) =>
  [...(medecins || [])].sort((a, b) =>
    (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }) ||
    (a.prenom || '').localeCompare(b.prenom || '', 'fr', { sensitivity: 'base' })
  );
