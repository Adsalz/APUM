// src/contexts/AuthContext.js
// Contexte d'authentification centralisé.
// - S'appuie sur onAuthStateChanged (corrige la race condition au rechargement
//   de page où auth.currentUser est encore null pendant la restauration de session)
// - Charge le profil Firestore (rôle inclus) une seule fois et le partage
//   avec toute l'application via useAuth()
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { logoutUser } from '../services/authService';
import logger from '../utils/logger';

const AuthContext = createContext({
  firebaseUser: null,
  profile: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userProfile = await getUser(user.uid);
          setProfile(userProfile);
        } catch (error) {
          logger.error('Erreur lors du chargement du profil utilisateur:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await logoutUser();
    setProfile(null);
  };

  const value = {
    firebaseUser,
    profile,
    role: profile ? profile.role : null,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
