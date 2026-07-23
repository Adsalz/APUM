import { db } from '../firebase';
import { collection, addDoc, Timestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import logger from '../utils/logger';

// Collection pour stocker les demandes d'emails à envoyer
const EMAIL_QUEUE_COLLECTION = 'email_queue';

// Configuration externalisée (plus d'adresse personnelle ni d'URL en dur dans le code)
export const EMAIL_FROM = process.env.REACT_APP_EMAIL_FROM || 'noreply@apum.fr';
export const APP_URL = process.env.REACT_APP_PUBLIC_URL || 'https://apum-8cfa4.web.app';

/**
 * Ajoute un email à la queue de traitement (`email_queue`), consommée par
 * l'extension Firebase « Trigger Email ». C'est l'UNIQUE point d'écriture :
 * tous les envois personnalisés (relances, test…) doivent passer par ici pour
 * garantir un format de document cohérent.
 *
 * @param {Object} params
 * @param {string|string[]} params.to - Destinataire(s) ; normalisé en tableau (requis par l'extension).
 * @param {string} params.subject - Sujet de l'email.
 * @param {string} params.text - Version texte du message.
 * @param {string} [params.html] - Version HTML ; par défaut, `text` avec les retours ligne convertis en <br>.
 * @param {Array} [params.attachments] - Pièces jointes au format nodemailer
 *        ([{ filename, content(base64), encoding: 'base64', contentType }]) ; placées
 *        dans `message.attachments` (l'extension transmet `message` tel quel à nodemailer).
 * @param {Object} [params.metadata] - Métadonnées applicatives (type, ids…) ; `sentAt` est ajouté automatiquement.
 */
export const enqueueEmail = async ({ to, subject, text, html, attachments, metadata = {} }) => {
  const message = {
    subject,
    text,
    html: html ?? text.replace(/\n/g, '<br>')
  };
  // Les pièces jointes vont DANS message (pas à la racine du doc) : nodemailer
  // ne lit que le sous-objet message transmis par l'extension Trigger Email.
  if (Array.isArray(attachments) && attachments.length > 0) {
    message.attachments = attachments;
  }

  await addDoc(collection(db, EMAIL_QUEUE_COLLECTION), {
    to: Array.isArray(to) ? to : [to], // TABLEAU requis par l'extension
    message,
    from: EMAIL_FROM,
    metadata: {
      ...metadata,
      sentAt: Timestamp.now()
    },
    createdAt: Timestamp.now()
  });
};

/**
 * Envoie une campagne (mail identique + pièces jointes) à une liste de médecins,
 * un mail individuel par médecin (pas de fuite d'adresses entre destinataires).
 * @param {Array} medecins - Destinataires ({ id, prenom, nom, email }).
 * @param {Object} mail - { subject, text, html } déjà assemblé.
 * @param {Array} [attachments] - Pièces jointes communes (format nodemailer base64).
 * @returns {Promise<{ succes: number, echecs: number, erreurs: Array }>}
 */
export const envoyerCampagneEnMasse = async (medecins, mail, attachments = []) => {
  const resultats = { succes: 0, echecs: 0, erreurs: [] };

  for (const medecin of medecins) {
    try {
      await enqueueEmail({
        to: medecin.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments,
        metadata: {
          type: 'campagne_desiderata',
          medecinId: medecin.id,
          medecinNom: `${medecin.prenom} ${medecin.nom}`,
          status: 'pending'
        }
      });
      resultats.succes++;

      // Petit délai entre chaque envoi pour ménager la queue / le SMTP.
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      resultats.echecs++;
      resultats.erreurs.push({
        medecin: `${medecin.prenom} ${medecin.nom}`,
        erreur: error.message
      });
    }
  }

  return resultats;
};

/**
 * Envoie une relance par email à un médecin
 * @param {Object} medecin - Les données du médecin
 * @param {string} subject - Sujet de l'email
 * @param {string} message - Contenu du message
 */
export const envoyerRelanceMedecin = async (medecin, subject = 'Rappel - Saisie de vos desiderata', message = '') => {
  try {
    const defaultMessage = message || `
Bonjour Dr ${medecin.nom},

Nous vous rappelons qu'il est important de saisir vos desiderata de planning dans les plus brefs délais.

Vous pouvez accéder à l'interface de saisie via le lien suivant :
${APP_URL}/formulaire-desirata

Merci de votre collaboration.

L'équipe APUM
    `.trim();

    await enqueueEmail({
      to: medecin.email,
      subject,
      text: defaultMessage,
      metadata: {
        type: 'relance_desiderata',
        medecinId: medecin.id,
        medecinNom: `${medecin.prenom} ${medecin.nom}`,
        status: 'pending'
      }
    });

    logger.debug(`Email de relance programmé pour ${medecin.email}`);
    return { success: true, message: 'Email de relance programmé avec succès' };
    
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la relance:', error);
    throw error;
  }
};

/**
 * Envoie des relances en masse
 * @param {Array} medecins - Liste des médecins à relancer
 * @param {string} subject - Sujet personnalisé
 * @param {string} message - Message personnalisé
 */
export const envoyerRelancesEnMasse = async (medecins, subject, message) => {
  const resultats = {
    succes: 0,
    echecs: 0,
    erreurs: []
  };

  for (const medecin of medecins) {
    try {
      await envoyerRelanceMedecin(medecin, subject, message);
      resultats.succes++;
      
      // Attendre un peu entre chaque envoi pour éviter de surcharger
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      resultats.echecs++;
      resultats.erreurs.push({
        medecin: `${medecin.prenom} ${medecin.nom}`,
        erreur: error.message
      });
    }
  }

  return resultats;
};

/**
 * Obtient la liste des médecins qui n'ont pas saisi leurs desiderata
 * @param {Array} medecins - Liste de tous les médecins
 * @param {Array} desiderataStatus - Statut des desiderata
 */
export const getMedecinsSansDesiderata = (medecins, desiderataStatus) => {
  return medecins.filter(medecin => {
    const medecinDesiderata = desiderataStatus?.find(d => d.userId === medecin.id);
    
    // Médecin n'a pas saisi du tout ou a une saisie incomplète
    return !medecinDesiderata || 
           !medecinDesiderata.desiderata || 
           Object.keys(medecinDesiderata.desiderata || {}).length === 0;
  });
};

/**
 * Obtient l'historique des relances envoyées
 */
export const getHistoriqueRelances = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, EMAIL_QUEUE_COLLECTION),
        where('metadata.type', '==', 'relance_desiderata'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique:', error);
    return [];
  }
};