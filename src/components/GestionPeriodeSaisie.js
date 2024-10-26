import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUser(authUser.uid);
          if (userData.role !== 'admin') {
            setError("Accès non autorisé");
            history.push('/');
          } else {
            setCurrentUser(userData);
            const periode = await getPeriodeSaisie();
            if (periode) {
              setStartDate(periode.startDate.split('T')[0]);
              setEndDate(periode.endDate.split('T')[0]);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          setError("Erreur lors de la récupération des données utilisateur");
        }
      } else {
        history.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [history]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setPeriodeSaisie(startDate, endDate);
      alert('Période de saisie mise à jour avec succès! Les desiderata obsolètes ont été supprimés.');
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la période de saisie:", error);
      setError("Une erreur est survenue lors de la mise à jour de la période de saisie");
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  if (!currentUser) {
    return <div>Utilisateur non autorisé</div>;
  }

  return (
    <div className="gestion-periode-saisie-container">
      <h1>Gestion de la période de saisie des desiderata</h1>
      <Link to="/dashboard-admin">Retour au tableau de bord</Link>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="startDate">Date de début:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="endDate">Date de fin:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button type="submit">Mettre à jour la période de saisie</button>
      </form>
    </div>
  );
}

export default GestionPeriodeSaisie;