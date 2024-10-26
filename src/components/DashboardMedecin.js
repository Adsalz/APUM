import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { getDesiderataByUser } from '../services/planningService';
import { logoutUser } from '../services/authService';
import ChangePassword from './ChangePassword';

function DashboardMedecin() {
  const [user, setUser] = useState(null);
  const [desiderata, setDesiderata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          console.log('Utilisateur authentifié:', authUser);
          const userData = await getUser(authUser.uid);
          console.log('Données utilisateur récupérées:', userData);
          if (userData && userData.role === 'medecin') {
            setUser(userData);
            try {
              const userDesiderata = await getDesiderataByUser(userData.id);
              setDesiderata(userDesiderata);
            } catch (desiderataError) {
              console.error('Erreur lors de la récupération des desiderata:', desiderataError);
              // On ne bloque pas l'affichage du dashboard si les desiderata ne peuvent pas être récupérés
            }
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
        setDesiderata([]);
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
      <h1>Tableau de bord Médecin</h1>
      <nav>
        <ul>
          <li><Link to="/formulaire-desirata">Saisir des desiderata</Link></li>
          <li><Link to="/visualisation-planning">Visualiser le planning</Link></li>
          <li><button onClick={() => setShowChangePassword(!showChangePassword)}>
            {showChangePassword ? 'Masquer' : 'Modifier le mot de passe'}
          </button></li>
        </ul>
      </nav>
      <div className="dashboard-content">
        <h2>Bienvenue, Dr. {user.nom}</h2>
        <p>Ici, vous pouvez accéder à vos fonctionnalités principales :</p>
        <ul>
          <li>Saisir vos desiderata pour les prochaines périodes</li>
          <li>Visualiser le planning actuel</li>
          <li>Modifier votre mot de passe</li>
        </ul>
        {desiderata.length > 0 && (
          <div>
            <h3>Vos derniers desiderata :</h3>
            <ul>
              {desiderata.map((d, index) => (
                <li key={index}>
                  Pour la période du {new Date(d.startDate).toLocaleDateString()} au {new Date(d.endDate).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showChangePassword && <ChangePassword />}
      </div>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}

export default DashboardMedecin;