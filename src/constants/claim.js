// src/constants/claim.js
//
// Modèle « premier code = le sien » (TOFU — trust on first use).
//
// Un compte médecin « à réclamer » a pour mot de passe le CODE_A_RECLAMER
// ci-dessous. À sa première connexion, le médecin saisit le code à 6 chiffres
// de son choix : l'app se connecte avec le code de réclamation puis fixe le
// code choisi comme nouveau mot de passe. Ensuite, il se connecte normalement
// avec son code.
//
// ⚠️ SÉCURITÉ (risque assumé, voir AUDIT.md) : cette valeur est embarquée dans
// le bundle, donc PUBLIQUE. La « fenêtre d'inscription » (config/inscription.open)
// limite la réclamation côté application, mais ce n'est PAS une barrière serveur :
// un acteur technique connaissant cette valeur pourrait réclamer un compte non
// encore réclamé. Choix explicite du propriétaire (priorité à l'absence de
// friction, groupe de confiance).
export const CODE_A_RECLAMER = 'apum-compte-a-reclamer';

// Le code médecin est strictement composé de 6 chiffres.
export const CODE_MEDECIN_LONGUEUR = 6;
export const CODE_MEDECIN_REGEX = /^\d{6}$/;

// Normalise une saisie en gardant au plus 6 chiffres.
export const nettoyerCode = (valeur) => (valeur || '').replace(/\D/g, '').slice(0, CODE_MEDECIN_LONGUEUR);
