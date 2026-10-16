// scripts/lib/alias.js
//
// ⚠️ Miroir CommonJS de src/utils/aliasConnexion.js (couvert par
// src/utils/__tests__/aliasConnexion.test.js). Les deux doivent rester
// alignés : l'annuaire public ne doit JAMAIS porter d'adresse réelle.
const DOMAINE_ALIAS = 'apum-login.invalid';

const aliasConnexion = (uid) => (uid ? `${String(uid).toLowerCase()}@${DOMAINE_ALIAS}` : null);

const estAliasConnexion = (email) =>
  typeof email === 'string' && email.toLowerCase().endsWith(`@${DOMAINE_ALIAS}`);

// Alias d'un compte dont l'identifiant n'est pas encore connu (création).
const aliasConnexionAleatoire = () =>
  `m-${require('crypto').randomUUID().replace(/-/g, '')}@${DOMAINE_ALIAS}`;

module.exports = { DOMAINE_ALIAS, aliasConnexion, estAliasConnexion, aliasConnexionAleatoire };
