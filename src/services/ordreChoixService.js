// src/services/ordreChoixService.js
//
// L'ordre de choix N'EST PAS recalculé à chaque génération de planning.
// C'est une liste qui se transmet d'un trimestre au suivant : elle est FIGÉE
// pour un trimestre donné, et n'évolue (bascule des N=10 premiers en bas, cf.
// src/utils/ordreChoix.js) qu'au passage au trimestre suivant. Régénérer dix
// fois le tableau d'un même trimestre doit donc relire dix fois la MÊME liste.
//
// D'où le stockage : un document par trimestre, `ordre_choix_<idPeriode>`
// (ex. `ordre_choix_2026-08`), dans la collection `planning` — écriture admin,
// lecture authentifiée, comme les autres documents `planning`.
//
// ⚠️ Ces documents ne portent volontairement PAS de champ `startDate` : la
// collection `planning` héberge aussi les plannings, que getLatestPlanning()
// récupère via orderBy('startDate'). Sans ce champ, un ordre de choix ne peut
// pas être confondu avec un planning.
import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  orderBy,
  documentId,
  startAt,
  endAt,
  endBefore,
  Timestamp,
} from 'firebase/firestore';
import logger from '../utils/logger';

const PLANNING_COLLECTION = 'planning';
const PREFIXE_ORDRE_CHOIX = 'ordre_choix_';

// Ancien emplacement (document unique, sans trimestre) : lu en repli tant que
// des installations n'ont pas encore basculé, jamais réécrit.
const ORDRE_CHOIX_DOC_LEGACY = 'ordre_choix';

const docIdPour = (idPeriode) => `${PREFIXE_ORDRE_CHOIX}${idPeriode}`;

// Borne haute quand aucun trimestre n'est fourni : un id valide (ASCII, sans
// caractère exotique susceptible d'être refusé comme nom de document) qui trie
// après tout `ordre_choix_AAAA-MM` réel.
const BORNE_MAX = docIdPour('9999-99');

const lire = async (docId) => {
  const snap = await getDoc(doc(db, PLANNING_COLLECTION, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Ordre de choix DÉJÀ VALIDÉ pour ce trimestre, ou null s'il reste à établir.
export const getOrdreChoixPeriode = async (idPeriode) => {
  if (!idPeriode) { return null; }
  try {
    return await lire(docIdPour(idPeriode));
  } catch (error) {
    logger.error('Erreur lors de la récupération de l’ordre de choix du trimestre:', error);
    throw error;
  }
};

// Dernier ordre de choix ANTÉRIEUR à `idPeriode` — la base sur laquelle appliquer
// la règle de bascule. Les ids sont de la forme `ordre_choix_AAAA-MM`, donc
// l'ordre lexicographique des ids EST l'ordre chronologique.
//
// La requête est bornée sur documentId() : elle ne rapatrie QUE les ordres de
// choix, pas les plannings (documents volumineux) ni `periode_saisie`, qui
// partagent la collection. Le document historique `ordre_choix` (sans souligné
// final) tombe lui aussi HORS de la borne basse — vérifié contre Firestore.
//
// ⚠️ Surtout PAS de limitToLast() ici : le SDK l'implémente en inversant le tri,
// et un `orderBy(__name__, 'desc')` sur cette collection réclame un index
// composite (FAILED_PRECONDITION, vérifié). On lit donc le range ascendant —
// quelques documents, un par trimestre — et on prend le dernier côté client.
export const getOrdreChoixPrecedent = async (idPeriode) => {
  try {
    const borneHaute = idPeriode ? endBefore(docIdPour(idPeriode)) : endAt(BORNE_MAX);

    const snapshot = await getDocs(query(
      collection(db, PLANNING_COLLECTION),
      orderBy(documentId()),
      startAt(PREFIXE_ORDRE_CHOIX),
      borneHaute
    ));

    if (!snapshot.empty) {
      const dernier = snapshot.docs[snapshot.docs.length - 1];
      return { id: dernier.id, ...dernier.data() };
    }
    return await lire(ORDRE_CHOIX_DOC_LEGACY);
  } catch (error) {
    logger.error('Erreur lors de la récupération de l’ordre de choix précédent:', error);
    throw error;
  }
};

// Fige l'ordre de choix du trimestre. Réécrire le même trimestre est sans danger :
// on remplace la liste de CE trimestre, on n'en dérive pas une nouvelle.
export const saveOrdreChoixPeriode = async (idPeriode, { premierTour, deuxiemeTour, libelle, baseSur }) => {
  try {
    if (!auth.currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    if (!idPeriode) {
      throw new Error('Période de saisie non définie : impossible de figer l’ordre de choix');
    }
    await setDoc(doc(db, PLANNING_COLLECTION, docIdPour(idPeriode)), {
      idPeriode,
      libelle: libelle || null,
      baseSur: baseSur || null,
      premierTour,
      deuxiemeTour,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde de l’ordre de choix:', error);
    throw error;
  }
};
