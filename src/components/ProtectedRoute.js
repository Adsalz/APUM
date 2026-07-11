// src/components/ProtectedRoute.js
// Garde de route centralisée :
// - attend la restauration de session Firebase (plus de redirection à tort
//   vers le login au rechargement de page)
// - redirige vers le login si non authentifié
// - contrôle le rôle si `roles` est fourni
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './ui/LoadingScreen';

function ProtectedRoute({ component: Component, render, roles, ...rest }) {
  const { firebaseUser, role, loading } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) {
          return <LoadingScreen />;
        }

        if (!firebaseUser) {
          return <Redirect to="/" />;
        }

        if (roles && !roles.includes(role)) {
          // Rôle non autorisé : renvoi vers le tableau de bord correspondant
          const home = role === 'admin' ? '/dashboard-admin' : '/dashboard-medecin';
          return <Redirect to={home} />;
        }

        return Component ? <Component {...props} /> : render(props);
      }}
    />
  );
}

export default ProtectedRoute;
