import { trierMedecinsParNom } from '../utils/medecins';

// URL publique de l'application, insérée dans le message de relance.
export const APP_URL = import.meta.env.REACT_APP_PUBLIC_URL || 'https://apum-8cfa4.web.app';

export const SUJET_RELANCE_DEFAUT = 'Rappel - Saisie de vos desiderata';

/**
 * Les relances ne sont plus envoyées par l'application : elle prépare un
 * brouillon dans le logiciel de messagerie de l'admin (lien `mailto:`).
 * L'ancienne file Firestore `email_queue` dépendait de l'extension
 * « Trigger Email », indisponible sur le plan gratuit (voir AUDIT.md, vague 5) :
 * les emails ne partaient plus alors que l'interface annonçait un succès.
 */

/** Corps du message proposé par défaut. */
export const messageRelanceParDefaut = () => `Bonjour,

Nous vous rappelons qu'il est important de saisir vos desiderata de planning dans les plus brefs délais.

Vous pouvez accéder à l'interface de saisie via le lien suivant :
${APP_URL}/formulaire-desirata

Merci de votre collaboration.

L'équipe APUM`;

// Navigateurs et clients mail tronquent les URL `mailto:` trop longues (la
// limite varie, ~2000 caractères dans le pire cas). On reste en deçà et on
// découpe la liste des destinataires en plusieurs brouillons si besoin.
export const LONGUEUR_MAX_MAILTO = 1800;

/**
 * Adresses email exploitables d'une liste de médecins (nettoyées, dédoublonnées).
 */
export const adressesDesMedecins = (medecins = []) => {
  const adresses = medecins
    .map(medecin => (medecin?.email || '').trim())
    .filter(Boolean);
  return [...new Set(adresses)];
};

const construireHref = (adresses, sujet, corps) =>
  `mailto:?bcc=${adresses.map(encodeURIComponent).join(',')}` +
  `&subject=${encodeURIComponent(sujet)}` +
  `&body=${encodeURIComponent(corps)}`;

/**
 * Prépare les brouillons de relance à ouvrir dans le logiciel de messagerie.
 *
 * Les destinataires sont placés en copie cachée : un médecin en retard ne voit
 * pas la liste des autres. Si l'URL dépasse `longueurMax`, la liste est
 * répartie sur plusieurs brouillons.
 *
 * @param {Object} options
 * @param {Array} options.medecins - Médecins à relancer
 * @param {string} options.sujet - Sujet de l'email
 * @param {string} options.message - Message personnalisé (vide = message par défaut)
 * @returns {Array<{adresses: string[], href: string}>} un lot par brouillon à ouvrir
 */
export const construireLotsRelance = ({
  medecins = [],
  sujet = SUJET_RELANCE_DEFAUT,
  message = '',
  longueurMax = LONGUEUR_MAX_MAILTO
} = {}) => {
  const corps = (message || '').trim() || messageRelanceParDefaut();
  const sujetFinal = (sujet || '').trim() || SUJET_RELANCE_DEFAUT;
  const adresses = adressesDesMedecins(medecins);

  if (adresses.length === 0) {
    return [];
  }

  const lots = [];
  let courant = [];

  adresses.forEach(adresse => {
    const candidat = [...courant, adresse];
    // Une adresse seule qui dépasserait la limite part quand même dans son
    // propre lot : mieux vaut un brouillon trop long qu'une adresse oubliée.
    if (courant.length > 0 && construireHref(candidat, sujetFinal, corps).length > longueurMax) {
      lots.push({ adresses: courant, href: construireHref(courant, sujetFinal, corps) });
      courant = [adresse];
    } else {
      courant = candidat;
    }
  });

  lots.push({ adresses: courant, href: construireHref(courant, sujetFinal, corps) });
  return lots;
};

/**
 * Obtient la liste des médecins qui n'ont pas saisi leurs desiderata
 * @param {Array} medecins - Liste de tous les médecins
 * @param {Array} desiderataStatus - Statut des desiderata
 */
export const getMedecinsSansDesiderata = (medecins, desiderataStatus) => {
  const sansDesiderata = medecins.filter(medecin => {
    const medecinDesiderata = desiderataStatus?.find(d => d.userId === medecin.id);

    // Médecin n'a pas saisi du tout ou a une saisie incomplète
    return !medecinDesiderata ||
           !medecinDesiderata.desiderata ||
           Object.keys(medecinDesiderata.desiderata || {}).length === 0;
  });
  // Ordre alphabétique (demande admin) — l'ordre Firestore est arbitraire.
  return trierMedecinsParNom(sansDesiderata);
};
