// src/components/PlanningVisualisation.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser, getMedecins } from '../services/userService';
import { 
  getPublishedPlanning, 
  getPeriodeSaisie 
} from '../services/planningService';
import { 
  Calendar, 
  ArrowLeft, 
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { createEvents } from 'ics';

const creneaux = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2, color: '#E3F2FD', textColor: '#1E88E5' },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3, color: '#E8F5E9', textColor: '#43A047' },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true, color: '#FFF3E0', textColor: '#FB8C00' },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3, color: '#F3E5F5', textColor: '#8E24AA' },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1, color: '#FFF3E0', textColor: '#FB8C00' },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3, color: '#E1F5FE', textColor: '#039BE5' }
];

function PlanningVisualisation() {
  // États
  const [planning, setPlanning] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' ou 'personal'
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodeSaisie, setPeriodeSaisie] = useState(null);

  const history = useHistory();

  // Effets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }
 
        const userData = await getUser(authUser.uid);
        if (!userData || userData.role !== 'medecin') {
          setError("Accès non autorisé");
          history.push('/');
          return;
        }
 
        // Charger tous les médecins
        const allMedecins = await getMedecins();
        setMedecins(allMedecins);
        setUser(userData);
 
        const periode = await getPeriodeSaisie();
        if (!periode) {
          setError("Aucune période de saisie n'a été définie");
          return;
        }
        setPeriodeSaisie(periode);
        setStartDate(periode.startDate.split('T')[0]);
        setEndDate(periode.endDate.split('T')[0]);
 
        const publishedPlan = await getPublishedPlanning();
        if (publishedPlan) {
          setPlanning(publishedPlan);
        } else {
          setError("Aucun planning n'a été publié");
        }
      } catch (error) {
        console.error("Erreur:", error);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
 
    fetchData();
  }, [history]);

  const exportToICS = () => {
    if (!planning || !planning.planning) return;

    const events = [];
    const sortedDates = Object.keys(planning.planning).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
      creneaux.forEach(creneau => {
        if (planning.planning[date][creneau.id]) {
          planning.planning[date][creneau.id].forEach((medecinId, index) => {
            if (medecinId === user.id) {
              const startDate = new Date(date);
              const endDate = new Date(date);
              let startHour, endHour;

              switch (creneau.id) {
                case 'QUART_1': startHour = 1; endHour = 7; break;
                case 'QUART_2': startHour = 7; endHour = 13; break;
                case 'RENFORT_1': startHour = 10; endHour = 13; break;
                case 'QUART_3': startHour = 13; endHour = 19; break;
                case 'RENFORT_2': startHour = 20; endHour = 24; break;
                case 'QUART_4': startHour = 19; endHour = 25; break;
                default: startHour = 0; endHour = 0; break;
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
                location: 'Hôpital'
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

  // Fonctions utilitaires
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getMedecinName = (medecinId) => {
    if (medecinId === user.id) {
      return `Dr. ${user.prenom} ${user.nom}`;
    }
    const medecin = medecins.find(m => m.id === medecinId);
    return medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Médecin non trouvé';
  };

  // Rendu conditionnel pour chargement et erreurs
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

  if (!planning || !planning.planning) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        Aucun planning disponible
      </div>
    );
  }

  // Filtrage des dates en fonction de la période sélectionnée
  const filteredDates = Object.keys(planning.planning)
    .filter(date => date >= startDate && date <= endDate)
    .sort((a, b) => new Date(a) - new Date(b));

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
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
              <span>Planning des gardes</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <button
              onClick={exportToICS}
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
                fontSize: '0.875rem'
              }}
            >
              <Download size={18} />
              Exporter (ICS)
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '2rem',
        marginTop: '80px', // Espace spécifique après le bandeau
        height: 'calc(100vh - 80px)', // Ajusté pour la nouvelle marge
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>

{/* Section des filtres */}
<div style={{
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '2rem',
  border: '1px solid #E5E7EB'
}}>
  {/* En-tête des filtres */}
  <button
    onClick={() => setShowFilters(!showFilters)}
    style={{
      width: '100%',
      padding: '1rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderBottom: showFilters ? '1px solid #E5E7EB' : 'none'
    }}
  >
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      color: '#374151'
    }}>
      <Filter size={20} />
      <span style={{ fontWeight: '500' }}>Filtres</span>
    </div>
    {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </button>

  {showFilters && (
    <div style={{ padding: '1.5rem' }}>
      <div style={{
        display: 'grid',
        gap: '1.5rem'
      }}>
        {/* Sélection du mode de vue */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Mode d'affichage
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: '#F3F4F6',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            width: 'fit-content'
          }}>
            <button
  onClick={() => setViewMode('all')}
  style={{
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    border: 'none',
    backgroundColor: viewMode === 'all' ? '#2563EB' : '#F3F4F6',
    color: viewMode === 'all' ? 'white' : '#374151',
    boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500'
  }}
>
  <Eye size={16} />
  Voir tout
</button>
<button
  onClick={() => setViewMode('personal')}
  style={{
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    border: 'none',
    backgroundColor: viewMode === 'personal' ? '#2563EB' : '#F3F4F6',
    color: viewMode === 'personal' ? 'white' : '#374151',
    boxShadow: viewMode === 'personal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500'
  }}
>
  <EyeOff size={16} />
  Mes gardes
</button>
          </div>
        </div>

        {/* Sélection de la période */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Période
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #D1D5DB',
                fontSize: '0.875rem'
              }}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #D1D5DB',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )}
</div>

{/* Tableau du planning */}
<div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflowX: 'auto',
    flexGrow: 1, // Pour prendre l'espace disponible
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB'
  }}>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.875rem',
      tableLayout: 'fixed' // Forcer une largeur fixe pour les colonnes
    }}>
      <colgroup>
        <col style={{ width: '120px' }} /> {/* Largeur fixe pour la colonne de date */}
        {creneaux.map(creneau => (
          <col key={creneau.id} style={{ width: `${100 / creneaux.length}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th style={{
            padding: '0.75rem',
            backgroundColor: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            textAlign: 'left',
            fontWeight: '600',
            position: 'sticky',
            left: 0,
            top: 0,
            zIndex: 20,
            backgroundColor: 'white',
            width: '120px'
          }}>
            Date
          </th>
          {creneaux.map(creneau => (
            <th key={creneau.id} style={{
              padding: '0.75rem',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              textAlign: 'left',
              fontWeight: '600',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div>{creneau.label}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6B7280'
              }}>
                {creneau.hours}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredDates.map(date => (
          <tr key={date} style={{
            backgroundColor: isWeekend(date) ? '#F9FAFB' : 'white'
          }}>
            <td style={{
              padding: '0.75rem',
              borderBottom: '1px solid #E5E7EB',
              fontWeight: '500',
              position: 'sticky',
              left: 0,
              backgroundColor: isWeekend(date) ? '#F9FAFB' : 'white',
              zIndex: 10,
              width: '120px'
            }}>
              {formatDate(date)}
            </td>
            {creneaux.map(creneau => (
              <td key={`${date}-${creneau.id}`} style={{
                padding: '0.75rem',
                borderBottom: '1px solid #E5E7EB',
                verticalAlign: 'top'
              }}>
                {(!creneau.samediOnly || new Date(date).getDay() === 6) && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    {planning.planning[date]?.[creneau.id]?.map((medecinId, index) => (
                      <div key={index} style={{
                        padding: '0.5rem',
                        backgroundColor: medecinId ? creneau.color : '#F3F4F6',
                        color: medecinId ? creneau.textColor : '#6B7280',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {medecinId ? getMedecinName(medecinId) : 'Non assigné'}
                      </div>
                    ))}
                  </div>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</main>
</div>
);
}

export default PlanningVisualisation;