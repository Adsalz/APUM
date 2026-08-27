// src/components/ProtectedRoute.js
// Garde de route centralisée (react-router v6, en route de layout) :
// - attend la restauration de session Firebase (plus de redirection à tort
//   vers le login au rechargement de page)
// - redirige vers le login si non authentifié
// - contrôle le rôle si `roles` est fourni, puis rend les routes enfants
//   via <Outlet />
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { reclamationEnCours } from '../constants/claim';
import LoadingScreen from './ui/LoadingScreen';

function ProtectedRoute({ roles }) {
  const { firebaseUser, role, loading, profileIndisponible } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!firebaseUser) {
    return <Navigate to="/" replace />;
  }

  // Réclamation interrompue (onglet rechargé pendant la seconde saisie du
  // code) : la session est encore au code partagé. Retour à la connexion, qui
  // la referme et explique.
  if (reclamationEnCours()) {
    return <Navigate to="/" replace />;
  }

  if (!role) {
    // Profil introuvable ou illisible : retour à la connexion, qui déconnecte
    // et explique. Auparavant on renvoyait vers /accueil — lui-même réservé au
    // rôle médecin — et la page restait blanche.
    if (profileIndisponible) {
      return <Navigate to="/" replace />;
    }
    // Session restaurée mais profil pas encore chargé : on attend.
    return <LoadingScreen />;
  }

  if (roles && !roles.includes(role)) {
    // Rôle non autorisé : renvoi vers son point d'entrée — tableau de bord pour
    // l'admin, aiguillage vers l'écran d'actualité pour le médecin.
    const home = role === 'admin' ? '/dashboard-admin' : '/accueil';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
