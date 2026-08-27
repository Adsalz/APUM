// src/components/AccueilMedecin.js
// Aiguillage d'entrée du médecin (route /accueil) : lit l'état du trimestre,
// puis renvoie sans détour vers l'écran d'actualité. Aucun contenu propre —
// c'est ce qui remplace l'ancien tableau de bord médecin.
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getPeriodeSaisie, getPublishedPlanning } from '../services/planningService';
import { accueilMedecin } from '../utils/accueilMedecin';
import { LoadingScreen } from './ui';
import logger from '../utils/logger';

function AccueilMedecin() {
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const resoudre = async () => {
      // Best-effort sur chaque lecture : une panne de l'une ne doit pas laisser
      // le médecin sur un écran de chargement sans issue — au pire il atterrit
      // sur le formulaire, qui affiche lui-même ce qui manque.
      const [periode, planning] = await Promise.all([
        getPeriodeSaisie().catch((err) => {
          logger.error('Accueil : lecture de la période impossible', err);
          return null;
        }),
        getPublishedPlanning().catch((err) => {
          logger.error('Accueil : lecture du planning publié impossible', err);
          return null;
        }),
      ]);
      if (!cancelled) {
        setDestination(accueilMedecin(periode, planning));
      }
    };

    resoudre();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!destination) {
    return <LoadingScreen message="Ouverture de votre espace…" />;
  }

  // `replace` : /accueil ne doit pas rester dans l'historique, sans quoi le
  // bouton « retour » du navigateur reboucle sur la redirection.
  return <Navigate to={destination} replace />;
}

export default AccueilMedecin;
