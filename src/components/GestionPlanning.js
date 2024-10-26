import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser, getMedecins } from '../services/userService';
import { 
  getLatestPlanning, 
  savePlanning, 
  updatePlanning, 
  getDesiderataForPeriod, 
  publishPlanning, 
  getPublishedPlanning, 
  getPeriodeSaisie 
} from '../services/planningService';
import { genererPlanning, creneaux } from '../utils/planningGenerator';
import { createEvents } from 'ics';

function GestionPlanning({ isAdmin = false }) {
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [publishedPlanning, setPublishedPlanning] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allMedecins, setAllMedecins] = useState([]);
  const [desiderata, setDesiderata] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [showDesiderata, setShowDesiderata] = useState(false);
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  
  const history = useHistory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }

        const userData = await getUser(authUser.uid);
        if (!isAdmin && userData.role !== 'medecin') {
          setError("Accès non autorisé");
          history.push('/');
          return;
        } else if (isAdmin && userData.role !== 'admin') {
          setError("Accès non autorisé");
          history.push('/');
          return;
        }

        setCurrentUser(userData);

        const periode = await getPeriodeSaisie();
        if (!periode) {
          setError("Aucune période de saisie n'a été définie");
          return;
        }
        setPeriodeSaisie(periode);

        const medecins = await getMedecins();
        setAllMedecins(medecins);

        if (isAdmin) {
          const latestPlanning = await getLatestPlanning();
          if (latestPlanning) {
            setPlanning(latestPlanning);
          }
          const publishedPlan = await getPublishedPlanning();
          setPublishedPlanning(publishedPlan);
        } else {
          const publishedPlan = await getPublishedPlanning();
          if (publishedPlan) {
            setPlanning(publishedPlan);
            setPublishedPlanning(publishedPlan);
          } else {
            setError("Aucun planning n'a été publié");
          }
        }

        const desiderataData = await getDesiderataForPeriod(periode.startDate, periode.endDate);
        const formattedDesiderata = formatDesiderata(desiderataData);
        setDesiderata(formattedDesiderata);

      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history, isAdmin]);

  const formatDesiderata = (desiderataData) => {
    const formatted = {};
    desiderataData.forEach(d => {
      formatted[d.userId] = {};
      Object.entries(d.desiderata).forEach(([date, creneaux]) => {
        const formattedDate = new Date(date).toISOString().split('T')[0];
        formatted[d.userId][formattedDate] = creneaux;
      });
    });
    return formatted;
  };

  const handleMedecinChange = (date, creneau, index, value) => {
    if (isAdmin && editMode) {
      setPlanning(prev => {
        const newPlanning = { ...prev };
        if (!newPlanning.planning[date]) {
          newPlanning.planning[date] = {};
        }
        if (!newPlanning.planning[date][creneau]) {
          newPlanning.planning[date][creneau] = [];
        }
        newPlanning.planning[date][creneau][index] = value || null;
        return newPlanning;
      });
      setModifie(true);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const sauvegarderModifications = async () => {
    try {
      await updatePlanning(planning.id, planning);
      setModifie(false);
      alert('Planning sauvegardé avec succès!');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du planning:", error);
      setError("Erreur lors de la sauvegarde du planning");
    }
  };

  const genererOuRegenererPlanning = async () => {
    if (periodeSaisie && periodeSaisie.startDate && periodeSaisie.endDate) {
      try {
        setLoading(true);
        const newPlanningData = await genererPlanning(periodeSaisie.startDate, periodeSaisie.endDate);
        if (planning && planning.id) {
          const updatedPlanning = { ...planning, planning: newPlanningData };
          await updatePlanning(planning.id, updatedPlanning);
          setPlanning(updatedPlanning);
        } else {
          const savedPlanningId = await savePlanning({
            planning: newPlanningData,
            startDate: periodeSaisie.startDate,
            endDate: periodeSaisie.endDate
          });
          setPlanning({ id: savedPlanningId, planning: newPlanningData });
        }
        setModifie(false);
        alert('Planning généré avec succès!');
      } catch (error) {
        console.error("Erreur lors de la génération du planning:", error);
        setError("Erreur lors de la génération du planning");
      } finally {
        setLoading(false);
      }
    } else {
      setError("La période de saisie n'est pas définie");
    }
  };

  const publierPlanning = async () => {
    try {
      await publishPlanning(planning.id);
      const updatedPublishedPlanning = await getPublishedPlanning();
      setPublishedPlanning(updatedPublishedPlanning);
      if (publishedPlanning) {
        alert('Planning mis à jour et publié avec succès!');
      } else {
        alert('Planning publié avec succès!');
      }
    } catch (error) {
      console.error("Erreur lors de la publication du planning:", error);
      setError("Erreur lors de la publication du planning: " + error.message);
    }
  };

  const getColor = (medecinId, date, creneauId) => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const choix = desiderata[medecinId]?.[formattedDate]?.[creneauId];
    switch(choix) {
      case 'Oui':
        return 'bg-green-200';
      case 'Possible':
        return 'bg-yellow-200';
      case 'Non':
        return 'bg-red-200';
      default:
        return 'bg-white';
    }
  };

  const sortMedecins = (medecins, date, creneauId) => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    return [...medecins].sort((a, b) => {
      const choixA = desiderata[a.id]?.[formattedDate]?.[creneauId] || '';
      const choixB = desiderata[b.id]?.[formattedDate]?.[creneauId] || '';
      const order = { 'Oui': 0, 'Possible': 1, '': 2, 'Non': 3 };
      return order[choixA] - order[choixB];
    });
  };

  const getDayOfWeek = (dateString) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const getMedecinName = (medecinId) => {
    const medecin = allMedecins.find(m => m.id === medecinId);
    return medecin ? `${medecin.prenom} ${medecin.nom}` : 'Non assigné';
  };

  const getChoixLabel = (choix) => {
    switch(choix) {
      case 'Oui':
        return '✓';
      case 'Possible':
        return '?';
      case 'Non':
        return '✗';
      default:
        return '-';
    }
  };

  const getChoixStyle = (choix) => {
    switch(choix) {
      case 'Oui':
        return 'text-green-600 font-bold';
      case 'Possible':
        return 'text-yellow-600 font-bold';
      case 'Non':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-400';
    }
  };

  const exportToICS = () => {
    if (!planning || !planning.planning) return;

    const events = [];
    const sortedDates = Object.keys(planning.planning).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
      creneaux.forEach(creneau => {
        if (planning.planning[date][creneau.id]) {
          planning.planning[date][creneau.id].forEach((medecinId, index) => {
            if (medecinId === currentUser.id) {
              const startDate = new Date(date);
              const endDate = new Date(date);
              let startHour, endHour;

              switch (creneau.id) {
                case 'QUART_1':
                  startHour = 1;
                  endHour = 7;
                  break;
                case 'QUART_2':
                  startHour = 7;
                  endHour = 13;
                  break;
                case 'RENFORT_1':
                  startHour = 10;
                  endHour = 13;
                  break;
                case 'QUART_3':
                  startHour = 13;
                  endHour = 19;
                  break;
                case 'RENFORT_2':
                  startHour = 20;
                  endHour = 24;
                  break;
                case 'QUART_4':
                  startHour = 19;
                  endHour = 25;
                  break;
              }

              startDate.setHours(startHour, 0, 0);
              endDate.setHours(endHour, 0, 0);

              if (endHour === 25) {
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(1, 0, 0);
              }

              events.push({
                start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
                end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes()],
                title: `Garde - ${creneau.label}`,
                description: `Garde médicale - ${creneau.label}`,
                location: 'Hôpital',
              });
            }
          });
        }
      });
    });

    createEvents(events, (error, value) => {
      if (error) {
        console.error(error);
        alert('Une erreur est survenue lors de la création du fichier ICS');
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'gardes.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  if (!currentUser || !periodeSaisie) {
    return <div>Données non disponibles</div>;
  }

  const sortedDates = planning && planning.planning ? 
    Object.keys(planning.planning).sort((a, b) => new Date(a) - new Date(b)) : 
    [];

  return (
    <div className="gestion-planning-container">
      <h1>{isAdmin ? "Gestion du Planning" : "Visualisation du Planning"}</h1>
      <Link to={isAdmin ? "/dashboard-admin" : "/dashboard-medecin"}>Retour au tableau de bord</Link>
      
      <p>Période de saisie: du {new Date(periodeSaisie.startDate).toLocaleDateString()} au {new Date(periodeSaisie.endDate).toLocaleDateString()}</p>
      
      {isAdmin && (
        <div className="mb-4">
          <button onClick={genererOuRegenererPlanning} className="mr-2">
            {planning ? 'Régénérer le planning' : 'Générer un nouveau planning'}
          </button>
          <button onClick={toggleEditMode} className="mr-2">
            {editMode ? 'Terminer l\'édition' : 'Modifier le planning'}
          </button>
          {modifie && (
            <button onClick={sauvegarderModifications} className="mr-2">
              Sauvegarder les modifications
            </button>
          )}
          {planning && (
            <button onClick={publierPlanning} className="mr-2">
              {publishedPlanning ? 'Mettre à jour et publier le planning' : 'Publier le planning'}
            </button>
          )}
          <button 
            onClick={() => setShowDesiderata(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Voir les desiderata
          </button>
        </div>
      )}

{!isAdmin && (
        <div className="mb-4">
          <button onClick={() => setViewMode('all')} className="mr-2">Voir tout le planning</button>
          <button onClick={() => setViewMode('personal')} className="mr-2">Voir mes gardes</button>
          <button onClick={exportToICS} className="mr-2">Exporter mes gardes (ICS)</button>
        </div>
      )}

      {/* Modale des desiderata */}
      {showDesiderata && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Visualisation des desiderata</h2>
              <button 
                onClick={() => setShowDesiderata(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Sélecteur de médecin */}
              <select 
                value={selectedMedecin || ''} 
                onChange={(e) => setSelectedMedecin(e.target.value)}
                className="medecin-select"
              >
                <option value="">Tous les médecins</option>
                {allMedecins.map(medecin => (
                  <option key={medecin.id} value={medecin.id}>
                    {medecin.prenom} {medecin.nom}
                  </option>
                ))}
              </select>

              {/* Tableau des desiderata */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      {!selectedMedecin && <th>Médecin</th>}
                      {creneaux.map(creneau => (
                        <th key={creneau.id}>{creneau.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map(date => {
                      const medecinsList = selectedMedecin 
                        ? [allMedecins.find(m => m.id === selectedMedecin)]
                        : allMedecins;
                      return medecinsList.map(medecin => (
                        <tr key={`${date}-${medecin.id}`}>
                          <td>
                            {`${getDayOfWeek(date)} ${new Date(date).toLocaleDateString()}`}
                          </td>
                          {!selectedMedecin && (
                            <td>{`${medecin.prenom} ${medecin.nom}`}</td>
                          )}
                          {creneaux.map(creneau => {
                            if (creneau.id === 'RENFORT_1' && new Date(date).getDay() !== 6) {
                              return <td key={`${date}-${creneau.id}`} className="text-center">-</td>;
                            }
                            const choix = desiderata[medecin.id]?.[date]?.[creneau.id];
                            return (
                              <td 
                                key={`${date}-${creneau.id}`} 
                                className={`text-center ${getChoixStyle(choix)}`}
                              >
                                {getChoixLabel(choix)}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {planning && planning.planning && Object.keys(planning.planning).length > 0 && (
        <table className="planning-table">
          <thead>
            <tr>
              <th>Date</th>
              {creneaux.map(creneau => (
                <th key={creneau.id}>{creneau.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDates.map(date => (
              <tr key={date}>
                <td>{`${getDayOfWeek(date)} ${new Date(date).toLocaleDateString()}`}</td>
                {creneaux.map(creneau => (
                  <td key={`${date}-${creneau.id}`}>
                    {(creneau.id !== 'RENFORT_1' || new Date(date).getDay() === 6) ? (
                      (planning.planning[date][creneau.id] && planning.planning[date][creneau.id].length > 0) ? (
                        planning.planning[date][creneau.id].map((medecinId, index) => {
                          if (!isAdmin && viewMode === 'personal' && medecinId !== currentUser.id) {
                            return null;
                          }
                          return (
                            <div key={`${date}-${creneau.id}-${index}`}>
                              {isAdmin && editMode ? (
                                <select
                                  value={medecinId || ""}
                                  onChange={(e) => handleMedecinChange(date, creneau.id, index, e.target.value)}
                                  className={`w-full p-1 border border-gray-300 rounded ${getColor(medecinId, date, creneau.id)}`}
                                >
                                  <option value="">Non assigné</option>
                                  {sortMedecins(allMedecins, date, creneau.id).map(medecin => (
                                    <option
                                      key={medecin.id}
                                      value={medecin.id}
                                      className={getColor(medecin.id, date, creneau.id)}
                                    >
                                      {`${medecin.prenom} ${medecin.nom}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                getMedecinName(medecinId)
                              )}
                            </div>
                          );
                        })
                      ) : (
                        'Non assigné'
                      )
                    ) : (
                      'N/A'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default GestionPlanning;