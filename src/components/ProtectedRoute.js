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
import LoadingScreen from './ui/LoadingScreen';

function ProtectedRoute({ roles }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!firebaseUser) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(role)) {
    // Rôle non autorisé : renvoi vers le tableau de bord correspondant
    const home = role === 'admin' ? '/dashboard-admin' : '/dashboard-medecin';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
