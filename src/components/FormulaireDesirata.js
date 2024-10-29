// src/components/FormulaireDesirata.js
import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { 
  addDesiderata, 
  getPeriodeSaisie, 
  getDesiderataByUser, 
  updateDesiderata 
} from '../services/planningService';
import { 
  Calendar,
  ArrowLeft,
  Save
} from 'lucide-react';
import QuickFill from './QuickFill';
import WeeklyPattern from './WeeklyPattern';

const creneaux = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3 }
];

const options = ['Oui', 'Possible', 'Non'];

const joursFeries = [
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11', '2024-12-25'
];

function FormulaireDesirata() {
  // États
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [desiderata, setDesiderata] = useState({});
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState(0);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  
  const history = useHistory();

  // Génération des dates
  const generateDates = useCallback(() => {
    if (!periodeSaisie) return [];
    const dates = [];
    let currentDate = new Date(periodeSaisie.startDate);
    const end = new Date(periodeSaisie.endDate);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  // Effet pour charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }

        const userData = await getUser(authUser.uid);
        if (userData && userData.role === 'medecin') {
          setUser(userData);
          const periode = await getPeriodeSaisie();
          if (periode) {
            setPeriodeSaisie(periode);
            const userDesiderata = await getDesiderataByUser(userData.id);
            const relevantDesiderata = userDesiderata.find(d => 
              new Date(d.startDate) <= new Date(periode.endDate) && 
              new Date(d.endDate) >= new Date(periode.startDate)
            );
            
            if (relevantDesiderata) {
              setExistingDesiderataId(relevantDesiderata.id);
              setDesiderata(relevantDesiderata.desiderata || {});
              setNombreGardesSouhaitees(relevantDesiderata.nombreGardesSouhaitees || 0);
              setNombreGardesMaxParSemaine(relevantDesiderata.nombreGardesMaxParSemaine || 3);
              setGardesGroupees(relevantDesiderata.gardesGroupees || false);
              setRenfortsAssocies(relevantDesiderata.renfortsAssocies || false);
            }
          } else {
            setError('Aucune période de saisie n\'a été définie par l\'administrateur.');
          }
        } else {
          setError('Utilisateur non autorisé');
          history.push('/');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history]);

  // Gestion des changements de desiderata
  const handleDesiderataChange = (date, creneau, value) => {
    setDesiderata(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [creneau]: value
      }
    }));
  };

  // Gestion du remplissage rapide
  const handleQuickFill = ({ creneaux: selectedCreneaux, jours: selectedJours, disponibilite, startDate, endDate }) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const dates = generateDates().filter(date => 
        date >= start && 
        date <= end
      );

      dates.forEach(date => {
        if (selectedJours.includes(date.getDay().toString())) {
          const dateString = date.toISOString().split('T')[0];
          if (!newDesiderata[dateString]) {
            newDesiderata[dateString] = {};
          }
          selectedCreneaux.forEach(creneauId => {
            if (creneauId !== 'RENFORT_1' || date.getDay() === 6) {
              newDesiderata[dateString][creneauId] = disponibilite;
            }
          });
        }
      });

      return newDesiderata;
    });
  };

  // Gestion du pattern hebdomadaire
  const handleApplyPattern = (pattern, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      let currentDate = new Date(start);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay().toString();
        const dateString = currentDate.toISOString().split('T')[0];

        if (pattern[dayOfWeek]) {
          newDesiderata[dateString] = { ...pattern[dayOfWeek] };
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return newDesiderata;
    });
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        if (!periodeSaisie || !periodeSaisie.startDate || !periodeSaisie.endDate) {
          throw new Error('Période de saisie non définie');
        }

        const desiderataData = {
          startDate: periodeSaisie.startDate,
          endDate: periodeSaisie.endDate,
          desiderata,
          nombreGardesSouhaitees,
          nombreGardesMaxParSemaine,
          gardesGroupees,
          renfortsAssocies
        };

        if (existingDesiderataId) {
          await updateDesiderata(existingDesiderataId, desiderataData);
          alert('Desiderata mis à jour avec succès!');
        } else {
          await addDesiderata(user.id, desiderataData);
          alert('Desiderata soumis avec succès!');
        }
        history.push('/dashboard-medecin');
      } catch (error) {
        console.error("Erreur lors de la soumission des desiderata:", error);
        setError('Une erreur est survenue lors de la soumission des desiderata: ' + error.message);
      }
    }
  };

  // Fonctions utilitaires
  const isWeekendOrHoliday = (date) => {
    const day = date.getDay();
    const formattedDate = date.toISOString().split('T')[0];
    return day === 0 || day === 6 || joursFeries.includes(formattedDate);
  };

  const formatDate = (date) => {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>Erreur</h2>
          <p style={{ color: '#4B5563', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => history.push('/dashboard-medecin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563EB',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const dates = generateDates();

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden' // Empêche le scroll horizontal
    }}>
      {/* Menu fixe en haut */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 40,
        width: '100%'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={() => history.push('/dashboard-medecin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#4B5563',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#2563EB',
              fontWeight: 'bold'
            }}>
              <Calendar size={24} />
              <span>Saisie des desiderata</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563EB',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Save size={18} />
            Enregistrer
          </button>
        </div>
      </nav>

      {/* Contenu principal */}
      <main style={{
        margin: '0 auto',
        paddingTop: '5rem',
        width: '100%',
        maxWidth: '1280px',
        boxSizing: 'border-box'
      }}>
        {/* En-tête avec période */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '1rem'
          }}>
            Période de saisie : du {new Date(periodeSaisie.startDate).toLocaleDateString()} au {new Date(periodeSaisie.endDate).toLocaleDateString()}
          </h2>

          {/* Préférences générales */}
          <div style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Nombre de gardes souhaitées par mois
              </label>
              <input
                type="number"
                value={nombreGardesSouhaitees}
                onChange={(e) => setNombreGardesSouhaitees(parseInt(e.target.value))}
                min="0"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Maximum de gardes par semaine
              </label>
              <input
                type="number"
                value={nombreGardesMaxParSemaine}
                onChange={(e) => setNombreGardesMaxParSemaine(parseInt(e.target.value))}
                min="1"
                max="7"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <input
                type="checkbox"
                id="gardesGroupees"
                checked={gardesGroupees}
                onChange={(e) => setGardesGroupees(e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '0.25rem',
                  borderColor: '#D1D5DB'
                }}
              />
              <label
                htmlFor="gardesGroupees"
                style={{
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
              >
                Gardes groupées dans un même week-end
              </label>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <input
                type="checkbox"
                id="renfortsAssocies"
                checked={renfortsAssocies}
                onChange={(e) => setRenfortsAssocies(e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '0.25rem',
                  borderColor: '#D1D5DB'
                }}
              />
              <label
                htmlFor="renfortsAssocies"
                style={{
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
              >
                Renforts associés à une garde
              </label>
            </div>
          </div>
        </div>

        {/* Outils de remplissage */}
        <div style={{
          display: 'grid',
          gap: '2rem',
          marginBottom: '2rem',
          gridTemplateColumns: '1fr', // Par défaut en une colonne sur mobile
          padding: '0 1rem', // Padding sur les côtés
          maxWidth: '100%', // S'assure que rien ne déborde
          boxSizing: 'border-box', // Inclut le padding dans la largeur
          margin: '0 auto 2rem', // Centre le contenu
          '@media (min-width: 768px)': { // Sur les écrans plus larges
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            padding: 0
          }
        }}>
          {/* Section remplissage rapide */}
          <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <QuickFill
              creneaux={creneaux}
              onApply={handleQuickFill}
              periodeSaisie={periodeSaisie}
            />
          </div>

          {/* Section pattern hebdomadaire */}
          <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <WeeklyPattern
              creneaux={creneaux}
              onApplyPattern={handleApplyPattern}
              periodeSaisie={periodeSaisie}
            />
          </div>
        </div>

{/* Tableau des desiderata */}
<div style={{
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflowX: 'auto'
}}>
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem'
  }}>
    <thead>
      <tr>
        <th style={{
          padding: '0.75rem',
          backgroundColor: '#F3F4F6',
          borderBottom: '1px solid #E5E7EB',
          textAlign: 'left',
          fontWeight: '600',
          position: 'sticky',
          left: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          Date
        </th>
        {creneaux.map(creneau => (
          <th key={creneau.id} style={{
            padding: '0.75rem',
            backgroundColor: '#F3F4F6',
            borderBottom: '1px solid #E5E7EB',
            textAlign: 'left',
            fontWeight: '600',
            minWidth: '150px'
          }}>
            <div>{creneau.label}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6B7280',
              fontWeight: 'normal'
            }}>
              {creneau.hours}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6B7280',
              fontWeight: 'normal'
            }}>
              {creneau.medecins} médecin{creneau.medecins > 1 ? 's' : ''}
            </div>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {dates.map(date => {
        const isHighlighted = isWeekendOrHoliday(date);
        const dateString = date.toISOString().split('T')[0];
        return (
          <tr key={dateString} style={{
            backgroundColor: isHighlighted ? '#F3F4F6' : 'white'
          }}>
            <td style={{
              padding: '0.75rem',
              borderBottom: '1px solid #E5E7EB',
              fontWeight: '500',
              position: 'sticky',
              left: 0,
              backgroundColor: isHighlighted ? '#F3F4F6' : 'white',
              zIndex: 10
            }}>
              {formatDate(date)}
            </td>
            {creneaux.map(creneau => (
              <td key={`${dateString}-${creneau.id}`} style={{
                padding: '0.75rem',
                borderBottom: '1px solid #E5E7EB'
              }}>
                {(!creneau.samediOnly || date.getDay() === 6) && (
                  <select
                    value={desiderata[dateString]?.[creneau.id] || ''}
                    onChange={(e) => handleDesiderataChange(dateString, creneau.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      backgroundColor: 'white',
                      color: (() => {
                        const value = desiderata[dateString]?.[creneau.id];
                        switch(value) {
                          case 'Oui': return '#059669';
                          case 'Possible': return '#D97706';
                          case 'Non': return '#DC2626';
                          default: return '#6B7280';
                        }
                      })()
                    }}
                  >
                    <option value="">Sélectionnez</option>
                    {options.map(option => (
                      <option 
                        key={option} 
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
</main>
</div>
);
}

export default FormulaireDesirata;