import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

const DESIDERATA_COLLECTION = 'desiderata';
const PLANNING_COLLECTION = 'planning';
const PERIODE_SAISIE_DOC = 'periode_saisie';

const convertToTimestamp = (dateString) => {
  if (dateString instanceof Timestamp) {
    return dateString;
  }
  const date = new Date(dateString);
  return Timestamp.fromDate(date);
};

const convertFromTimestamp = (timestamp) => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  console.error('Format de date non reconnu:', timestamp);
  return null;
};

export const setPeriodeSaisie = async (startDate, endDate) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    
    await setDoc(doc(db, PLANNING_COLLECTION, PERIODE_SAISIE_DOC), { 
      startDate: convertToTimestamp(startDate),
      endDate: convertToTimestamp(endDate)
    });

    await deleteObsoleteDesiderata(startDate, endDate);

    console.log('Période de saisie mise à jour et desiderata obsolètes supprimés');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la période de saisie:', error);
    throw error;
  }
};

const deleteObsoleteDesiderata = async (newStartDate, newEndDate) => {
  try {
    const desiderataRef = collection(db, DESIDERATA_COLLECTION);
    const q = query(desiderataRef);
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      const desiderata = doc.data();
      if (isDesiderataObsolete(desiderata, newStartDate, newEndDate)) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log('Desiderata obsolètes supprimés');
  } catch (error) {
    console.error('Erreur lors de la suppression des desiderata obsolètes:', error);
    throw error;
  }
};

const isDesiderataObsolete = (desiderata, newStartDate, newEndDate) => {
  const desiderataStart = desiderata.startDate.toDate();
  const desiderataEnd = desiderata.endDate.toDate();
  const newStart = new Date(newStartDate);
  const newEnd = new Date(newEndDate);

  return desiderataEnd < newStart || desiderataStart > newEnd;
};

export const getPeriodeSaisie = async () => {
  try {
    const periodeDoc = await getDoc(doc(db, PLANNING_COLLECTION, PERIODE_SAISIE_DOC));
    if (periodeDoc.exists()) {
      const data = periodeDoc.data();
      return {
        startDate: convertFromTimestamp(data.startDate),
        endDate: convertFromTimestamp(data.endDate)
      };
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la période de saisie:', error);
    throw error;
  }
};

export const addDesiderata = async (userId, desiderata) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const docRef = await addDoc(collection(db, DESIDERATA_COLLECTION), {
      userId,
      startDate: convertToTimestamp(desiderata.startDate),
      endDate: convertToTimestamp(desiderata.endDate),
      desiderata: desiderata.desiderata,
      nombreGardesSouhaitees: desiderata.nombreGardesSouhaitees,
      nombreGardesMaxParSemaine: desiderata.nombreGardesMaxParSemaine, // Ajout de ce champ
      gardesGroupees: desiderata.gardesGroupees,
      renfortsAssocies: desiderata.renfortsAssocies
    });
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de l\'ajout des desiderata:', error);
    throw error;
  }
};

export const updateDesiderata = async (desiderataId, desiderata) => {
  try {
    const desiderataRef = doc(db, DESIDERATA_COLLECTION, desiderataId);
    await updateDoc(desiderataRef, {
      startDate: convertToTimestamp(desiderata.startDate),
      endDate: convertToTimestamp(desiderata.endDate),
      desiderata: desiderata.desiderata,
      nombreGardesSouhaitees: desiderata.nombreGardesSouhaitees,
      nombreGardesMaxParSemaine: desiderata.nombreGardesMaxParSemaine, // Ajout de ce champ
      gardesGroupees: desiderata.gardesGroupees,
      renfortsAssocies: desiderata.renfortsAssocies
    });
    console.log('Desiderata mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des desiderata:', error);
    throw error;
  }
};

export const getDesiderataByUser = async (userId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const q = query(collection(db, DESIDERATA_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        startDate: convertFromTimestamp(data.startDate),
        endDate: convertFromTimestamp(data.endDate)
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des desiderata:', error);
    throw error;
  }
};

export const getDesiderataForPeriod = async (debut, fin) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const debutTimestamp = convertToTimestamp(debut);
    const finTimestamp = convertToTimestamp(fin);

    const q = query(
      collection(db, DESIDERATA_COLLECTION),
      where("startDate", "<=", finTimestamp),
      where("endDate", ">=", debutTimestamp)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        startDate: convertFromTimestamp(data.startDate),
        endDate: convertFromTimestamp(data.endDate),
        desiderata: data.desiderata,
        nombreGardesSouhaitees: data.nombreGardesSouhaitees,
        gardesGroupees: data.gardesGroupees,
        renfortsAssocies: data.renfortsAssocies
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des desiderata pour la période:', error);
    throw error;
  }
};

export const savePlanning = async (planning) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const docRef = await addDoc(collection(db, PLANNING_COLLECTION), {
      ...planning,
      startDate: convertToTimestamp(planning.startDate),
      endDate: convertToTimestamp(planning.endDate),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du planning:', error);
    throw error;
  }
};

export const updatePlanning = async (planningId, planning) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const planningRef = doc(db, PLANNING_COLLECTION, planningId);
    await updateDoc(planningRef, {
      ...planning,
      startDate: convertToTimestamp(planning.startDate),
      endDate: convertToTimestamp(planning.endDate),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du planning:', error);
    throw error;
  }
};

export const getLatestPlanning = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const q = query(collection(db, PLANNING_COLLECTION), orderBy('startDate', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const latestDoc = querySnapshot.docs[0];
    const data = latestDoc.data();
    return { 
      id: latestDoc.id, 
      ...data,
      startDate: convertFromTimestamp(data.startDate),
      endDate: convertFromTimestamp(data.endDate)
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du dernier planning:', error);
    throw error;
  }
};

export const deletePlanning = async (planningId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    await deleteDoc(doc(db, PLANNING_COLLECTION, planningId));
  } catch (error) {
    console.error('Erreur lors de la suppression du planning:', error);
    throw error;
  }
};

export const publishPlanning = async (planningId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const planningRef = doc(db, PLANNING_COLLECTION, planningId);
    await updateDoc(planningRef, {
      publishedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erreur lors de la publication du planning:', error);
    throw error;
  }
};

export const getPublishedPlanning = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    const q = query(
      collection(db, PLANNING_COLLECTION), 
      where("publishedAt", "!=", null),
      orderBy("publishedAt", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const publishedDoc = querySnapshot.docs[0];
    const data = publishedDoc.data();
    return { 
      id: publishedDoc.id, 
      ...data,
      startDate: convertFromTimestamp(data.startDate),
      endDate: convertFromTimestamp(data.endDate),
      publishedAt: convertFromTimestamp(data.publishedAt)
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du planning publié:', error);
    throw error;
  }
};