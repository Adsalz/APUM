import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';

function DefinitionPeriode() {
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
              setStartDate(periode.startDate);
              setEndDate(periode.endDate);
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
      alert('Période de saisie définie avec succès!');
    } catch (error) {
      console.error("Erreur lors de la définition de la période:", error);
      setError("Erreur lors de la définition de la période");
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
    <div className="definition-periode-container">
      <h1>Définition de la période de saisie des desiderata</h1>
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
        <button type="submit">Définir la période</button>
      </form>
    </div>
  );
}

export default DefinitionPeriode;