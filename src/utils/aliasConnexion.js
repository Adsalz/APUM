// src/utils/aliasConnexion.js
//
// Adresse de connexion des comptes médecin.
//
// POURQUOI : la liste déroulante de connexion est peuplée AVANT toute
// authentification, donc la collection `annuaire` est en lecture publique. Elle
// contenait l'adresse email réelle de chaque médecin : n'importe qui pouvait
// donc télécharger 53 adresses personnelles (audit du 16/10/2026). On y met
// désormais un ALIAS opaque, dérivé de l'identifiant du compte et sans aucune
// valeur personnelle. L'adresse réelle ne vit plus que dans `users`, fermé aux
// non-authentifiés.
//
// `.invalid` est un domaine réservé (RFC 2606) qui ne résoudra jamais : aucun
// message ne peut partir par erreur vers une vraie boîte.
//
// ⚠️ Conséquence assumée : plus aucun email ne peut atteindre un médecin depuis
// Firebase Auth — la réinitialisation en libre-service (« Code oublié ») est
// remplacée par un appel à l'administrateur, qui remet le code à la main
// (scripts/reinitialiser-code.js). Les ADMINS, eux, gardent leur adresse réelle
// comme identifiant : ils ne figurent pas dans l'annuaire public.
export const DOMAINE_ALIAS = 'apum-login.invalid';

// Firebase Auth met les adresses en minuscules à l'enregistrement : on génère
// donc directement la forme minuscule, pour que la valeur stockée et la valeur
// relue soient identiques.
export const aliasConnexion = (uid) =>
  uid ? `${String(uid).toLowerCase()}@${DOMAINE_ALIAS}` : null;

export const estAliasConnexion = (email) =>
  typeof email === 'string' && email.toLowerCase().endsWith(`@${DOMAINE_ALIAS}`);

// Alias d'un compte CRÉÉ depuis l'application : son identifiant n'existe pas
// encore au moment où il faut fournir une adresse. On en tire une au hasard
// plutôt que de créer le compte puis de le renommer — un renommage qui échoue
// laisserait le compte et l'annuaire en désaccord, donc un médecin incapable de
// se connecter. L'adresse réelle du lien compte ↔ personne vit dans `users`.
const jetonAleatoire = () => {
  const alea = typeof window !== 'undefined' ? window.crypto : undefined;
  if (alea && typeof alea.randomUUID === 'function') {
    return alea.randomUUID().replace(/-/g, '');
  }
  // Repli (contexte sans Web Crypto) : l'alias n'a pas besoin d'être
  // imprévisible, seulement unique — il ne protège rien, c'est le code à 6
  // chiffres qui authentifie.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export const aliasConnexionAleatoire = () => `m-${jetonAleatoire()}@${DOMAINE_ALIAS}`;
