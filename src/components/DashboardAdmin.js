import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { logoutUser } from '../services/authService';
import ChangePassword from './ChangePassword';

function DashboardAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUser(authUser.uid);
          if (userData && userData.role === 'admin') {
            setUser(userData);
          } else {
            setError('Utilisateur non autorisé ou données manquantes');
            history.push('/');
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données:', error);
          setError('Erreur lors de la récupération des données: ' + error.message);
        }
      } else {
        setUser(null);
        history.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [history]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      history.push('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setError('Erreur lors de la déconnexion: ' + error.message);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  if (!user) {
    return <div>Utilisateur non trouvé</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Tableau de bord Administrateur</h1>
      <nav>
        <ul>
          <li><Link to="/gestion-utilisateurs">Gestion des utilisateurs</Link></li>
          <li><Link to="/gestion-planning-admin">Gestion du planning</Link></li>
          <li><Link to="/gestion-periode-saisie">Gestion de la période de saisie</Link></li>
          <li><button onClick={() => setShowChangePassword(!showChangePassword)}>
            {showChangePassword ? 'Masquer' : 'Modifier le mot de passe'}
          </button></li>
        </ul>
      </nav>
      <div className="dashboard-content">
        <h2>Bienvenue, {user.prenom} {user.nom}</h2>
        <p>Ici, vous pouvez accéder à vos fonctionnalités principales :</p>
        <ul>
          <li>Gérer les utilisateurs</li>
          <li>Gérer le planning</li>
          <li>Définir la période de saisie des desiderata</li>
          <li>Modifier votre mot de passe</li>
        </ul>
        {showChangePassword && <ChangePassword />}
      </div>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}

export default DashboardAdmin;