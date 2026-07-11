import React, { useState, useEffect } from 'react';
import { getMedecins } from '../services/userService';
import { getDesiderataStatus, getPeriodeSaisie } from '../services/planningService';
import { Search, Mail, Download } from 'lucide-react';
import DesiderataStatus from './DesiderataStatus';
import RelanceEmailModal from './RelanceEmailModal';
import { getMedecinsSansDesiderata } from '../services/emailService';
import { exportDesiderataToExcel } from '../services/excelExportService';
import { AppHeader, LoadingScreen, ErrorScreen, Alert } from './ui';
import logger from '../utils/logger';

function GestionDesiderata() {
  const [medecins, setMedecins] = useState([]);
  const [desiderataStatus, setDesiderataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Auth/rôle admin garantis par ProtectedRoute : on charge uniquement les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const medecinsList = await getMedecins();
        setMedecins(medecinsList);

        const statusData = await getDesiderataStatus();
        setDesiderataStatus(statusData.desiderata);

      } catch (error) {
        logger.error('Erreur:', error);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredMedecins = () => {
    if (!medecins) {return [];}

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
        case 'non_saisi':
          return !medecinDesiderata;
        default:
          return true;
        }
      });
    }

    return filtered;
  };

  const handleRelanceSuccess = (resultats) => {
    setSuccessMessage(`${resultats.succes} email(s) de relance envoyé(s) avec succès !`);
    setTimeout(() => setSuccessMessage(''), 5000); // Masquer après 5 secondes
  };

  const medecinsSansDesiderata = getMedecinsSansDesiderata(medecins, desiderataStatus || []);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const periode = await getPeriodeSaisie();
      if (!periode) {
        setErrorMessage('Aucune période de saisie définie');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      const result = await exportDesiderataToExcel(medecins, desiderataStatus || [], periode);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      logger.error('Erreur lors de l\'export Excel:', error);
      setErrorMessage('Erreur lors de l\'export Excel');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Menu fixe en haut */}
      <AppHeader backTo="/dashboard-admin" />

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ color: '#6B7280' }}>
                Visualisez l'état de saisie des desiderata pour chaque médecin
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || medecins.length === 0}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: isExporting ? '#9CA3AF' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: isExporting || medecins.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                title="Exporter tous les desiderata vers Excel"
              >
                <Download size={16} />
                {isExporting ? 'Export...' : 'Exporter Excel'}
              </button>
              <button
                onClick={() => setShowRelanceModal(true)}
                disabled={medecinsSansDesiderata.length === 0}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: medecinsSansDesiderata.length > 0 ? '#DC2626' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: medecinsSansDesiderata.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                title={medecinsSansDesiderata.length === 0 ? 'Tous les médecins ont saisi leurs desiderata' : 'Envoyer des relances par email'}
              >
                <Mail size={16} />
                Relancer par email ({medecinsSansDesiderata.length})
              </button>
            </div>
          </div>
        </div>

        {/* Messages de feedback */}
        {successMessage && (
          <Alert kind="success" className="mb-4">
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert kind="error" className="mb-4">
            {errorMessage}
          </Alert>
        )}

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

      {/* Modals */}
      <RelanceEmailModal
        isOpen={showRelanceModal}
        onClose={() => setShowRelanceModal(false)}
        medecins={medecins}
        desiderataStatus={desiderataStatus || []}
        onSuccess={handleRelanceSuccess}
      />
      
    </div>
  );
}

export default GestionDesiderata;
