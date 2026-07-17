import { db } from '../firebase';
import { collection, addDoc, Timestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import logger from '../utils/logger';

// Collection pour stocker les demandes d'emails à envoyer
const EMAIL_QUEUE_COLLECTION = 'email_queue';

// Configuration externalisée (plus d'adresse personnelle ni d'URL en dur dans le code)
export const EMAIL_FROM = process.env.REACT_APP_EMAIL_FROM || 'noreply@apum.fr';
export const APP_URL = process.env.REACT_APP_PUBLIC_URL || 'https://apum-8cfa4.web.app';

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

    // Ajouter l'email à la queue de traitement - FORMAT OFFICIEL
    await addDoc(collection(db, EMAIL_QUEUE_COLLECTION), {
      to: [medecin.email], // TABLEAU requis !
      message: {
        subject: subject,
        text: defaultMessage,
        html: defaultMessage.replace(/\n/g, '<br>')
      },
      from: EMAIL_FROM,
      metadata: {
        type: 'relance_desiderata',
        medecinId: medecin.id,
        medecinNom: `${medecin.prenom} ${medecin.nom}`,
        sentAt: Timestamp.now(),
        status: 'pending'
      },
      createdAt: Timestamp.now()
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