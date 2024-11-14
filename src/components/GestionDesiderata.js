import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser, getMedecins } from '../services/userService';
import { getDesiderataStatus } from '../services/planningService';
import { ArrowLeft, ClipboardList, Search } from 'lucide-react';
import DesiderataStatus from './DesiderataStatus';

function GestionDesiderata() {
  const [medecins, setMedecins] = useState([]);
  const [desiderataStatus, setDesiderataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
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
        if (!userData || userData.role !== 'admin') {
          setError('Utilisateur non autorisé');
          history.push('/');
          return;
        }

        const medecinsList = await getMedecins();
        setMedecins(medecinsList);

        const statusData = await getDesiderataStatus();
        setDesiderataStatus(statusData.desiderata);

      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history]);

  const getFilteredMedecins = () => {
    if (!medecins) return [];

    let filtered = medecins;

    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(medecin => 
        `${medecin.prenom} ${medecin.nom}`.toLowerCase().includes(search)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'tous') {
      filtered = filtered.filter(medecin => {
        const medecinDesiderata = desiderataStatus?.find(d => d.userId === medecin.id);
        
        switch (statusFilter) {
          case 'complet':
            return medecinDesiderata && Object.keys(medecinDesiderata.desiderata || {}).length > 0;
          case 'incomplet':
            return medecinDesiderata && Object.keys(medecinDesiderata.desiderata || {}).length === 0;
          case 'non_saisi':
            return !medecinDesiderata;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

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
        </div>
      </div>
    );
  }

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
        zIndex: 40
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
            gap: '0.5rem',
            color: '#D97706',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            <ClipboardList size={24} />
            <span>État des Desiderata</span>
          </div>

          <button
            onClick={() => history.push('/dashboard-admin')}
            style={{
              padding: '0.5rem 1rem',
              color: '#4B5563',
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            <ArrowLeft size={18} />
            Retour
          </button>
        </div>
      </nav>

      {/* Contenu principal */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 1rem 2rem'
      }}>
        {/* En-tête de la page */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '0.5rem'
          }}>
            Suivi des Desiderata
          </h1>
          <p style={{ color: '#6B7280' }}>
            Visualisez l'état de saisie des desiderata pour chaque médecin
          </p>
        </div>

        {/* Filtres et recherche */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Barre de recherche */}
            <div style={{
              position: 'relative'
            }}>
              <input
                type="text"
                placeholder="Rechercher un médecin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.875rem',
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
              />
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }}
              />
            </div>

            {/* Filtres par statut */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setStatusFilter('tous')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: statusFilter === 'tous' ? '#2563EB' : '#F9FAFB',
                  color: statusFilter === 'tous' ? 'white' : '#4B5563',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('complet')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: statusFilter === 'complet' ? '#059669' : '#F9FAFB',
                  color: statusFilter === 'complet' ? 'white' : '#4B5563',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Complet
              </button>
              <button
                onClick={() => setStatusFilter('incomplet')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: statusFilter === 'incomplet' ? '#D97706' : '#F9FAFB',
                  color: statusFilter === 'incomplet' ? 'white' : '#4B5563',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Incomplet
              </button>
              <button
                onClick={() => setStatusFilter('non_saisi')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #E5E7EB',
                  backgroundColor: statusFilter === 'non_saisi' ? '#DC2626' : '#F9FAFB',
                  color: statusFilter === 'non_saisi' ? 'white' : '#4B5563',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Non saisi
              </button>
            </div>
          </div>
        </div>

        {/* Liste des médecins et leur statut */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {medecins.length > 0 && (
            <DesiderataStatus 
              medecins={getFilteredMedecins()}
              desiderata={desiderataStatus || []}
            />
          )}
          {getFilteredMedecins().length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6B7280'
            }}>
              Aucun médecin ne correspond aux critères de recherche
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default GestionDesiderata;
