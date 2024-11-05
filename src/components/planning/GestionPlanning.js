// src/components/planning/GestionPlanning.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../../firebase';
import { getUser, getMedecins } from '../../services/userService';
import { 
  getLatestPlanning, 
  savePlanning, 
  updatePlanning, 
  getDesiderataForPeriod, 
  publishPlanning, 
  getPublishedPlanning, 
  getPeriodeSaisie 
} from '../../services/planningService';
import { genererPlanning, creneaux } from '../../utils/planningGenerator';
import { AlertTriangle, Check } from 'lucide-react';

// Import des sous-composants
import PlanningHeader from './PlanningHeader';
import PlanningFilters from './PlanningFilters';
import PlanningStatistics from './PlanningStatistics';
import PlanningTable from './PlanningTable';
import MedecinInfoPanel from './MedecinInfoPanel';
import GeneratePlanningModal from './modals/GeneratePlanningModal';
import PublishPlanningModal from './modals/PublishPlanningModal';
import DiscardChangesModal from './modals/DiscardChangesModal';
import ExportDesiderataModal from '../ExportDesiderataModal';

function GestionPlanning({ isAdmin = true }) {
  // États pour les données
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [publishedPlanning, setPublishedPlanning] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [desiderata, setDesiderata] = useState([]);

  // États pour l'interface utilisateur
  const [editMode, setEditMode] = useState(false);
  const [modified, setModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // États pour les filtres
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [creneauFilter, setCreneauFilter] = useState('all');
  const [selectedMedecin, setSelectedMedecin] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  // États pour les modales
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDiscardChanges, setShowDiscardChanges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const history = useHistory();

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
        if (!userData || userData.role !== 'admin') {
          setError('Accès non autorisé');
          history.push('/');
          return;
        }

        // Chargement des données de base
        const [periode, medecinsList, latestPlan, publishedPlan] = await Promise.all([
          getPeriodeSaisie(),
          getMedecins(),
          getLatestPlanning(),
          getPublishedPlanning()
        ]);

        setPeriodeSaisie(periode);
        setMedecins(medecinsList);

        if (latestPlan) {
          setPlanning(latestPlan);
          setDateFilter({
            start: latestPlan.startDate.split('T')[0],
            end: latestPlan.endDate.split('T')[0]
          });
        }

        setPublishedPlanning(publishedPlan);

        // Charger les desiderata si une période est définie
        if (periode) {
          const desiderataData = await getDesiderataForPeriod(
            periode.startDate,
            periode.endDate
          );
          setDesiderata(desiderataData);
        }

      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history]);

  // Gestion des notifications
  const showNotification = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  // Handlers pour les actions principales
  const handleGeneratePlanning = async () => {
    setLoading(true);
    try {
      if (!periodeSaisie) {
        throw new Error('Période de saisie non définie');
      }

      const newPlanningData = await genererPlanning(
        periodeSaisie.startDate, 
        periodeSaisie.endDate
      );

      if (planning && planning.id) {
        const updatedPlanning = { 
          ...planning, 
          planning: newPlanningData 
        };
        await updatePlanning(planning.id, updatedPlanning);
        setPlanning(updatedPlanning);
      } else {
        const savedPlanningId = await savePlanning({
          planning: newPlanningData,
          startDate: periodeSaisie.startDate,
          endDate: periodeSaisie.endDate
        });
        setPlanning({ 
          id: savedPlanningId, 
          planning: newPlanningData 
        });
      }

      showNotification('Planning généré avec succès');
      setModified(false);
      setShowGenerateConfirm(false);
    } catch (error) {
      console.error("Erreur lors de la génération du planning:", error);
      showNotification("Erreur lors de la génération du planning", true);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPlanning = async () => {
    setLoading(true);
    try {
      if (!planning || !planning.id) {
        throw new Error('Aucun planning à publier');
      }

      await publishPlanning(planning.id);
      const updatedPublishedPlanning = await getPublishedPlanning();
      setPublishedPlanning(updatedPublishedPlanning);
      
      showNotification('Planning publié avec succès');
      setShowPublishConfirm(false);
    } catch (error) {
      console.error("Erreur lors de la publication:", error);
      showNotification("Erreur lors de la publication du planning", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      if (!planning || !planning.id) {
        throw new Error('Aucun planning à sauvegarder');
      }

      await updatePlanning(planning.id, planning);
      showNotification('Modifications sauvegardées avec succès');
      setModified(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      showNotification("Erreur lors de la sauvegarde des modifications", true);
    } finally {
      setLoading(false);
    }
  };

  const handleMedecinChange = (date, creneau, index, medecinId) => {
    if (!editMode) return;

    setPlanning(prev => {
      const newPlanning = { ...prev };
      if (!newPlanning.planning[date]) {
        newPlanning.planning[date] = {};
      }
      if (!newPlanning.planning[date][creneau]) {
        newPlanning.planning[date][creneau] = Array(
          creneaux.find(c => c.id === creneau)?.medecins || 0
        ).fill(null);
      }
      newPlanning.planning[date][creneau][index] = medecinId || null;
      return newPlanning;
    });
    setModified(true);
  };

  const toggleEditMode = () => {
    if (editMode && modified) {
      setShowDiscardChanges(true);
      return;
    }
    setEditMode(!editMode);
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '2px solid #E5E7EB',
            borderTop: '2px solid #2563EB',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#6B7280' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* En-tête */}
      <PlanningHeader
        editMode={editMode}
        modified={modified}
        onEditToggle={toggleEditMode}
        onGenerateClick={() => setShowGenerateConfirm(true)}
        onPublishClick={() => setShowPublishConfirm(true)}
        onSaveChanges={handleSaveChanges}
        onBackClick={() => history.push('/dashboard-admin')}
        onExportClick={() => setShowExportModal(true)}
        planning={planning}
      />

      {/* Notifications */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 50,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#DCFCE7',
          color: '#16A34A',
          padding: '1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 50,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Contenu principal */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 1rem 2rem'
      }}>
        {/* Statistiques */}
        <PlanningStatistics
          medecins={medecins}
          periodeSaisie={periodeSaisie}
          planning={planning}
          publishedPlanning={publishedPlanning}
        />

        {/* Filtres */}
        <PlanningFilters
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          creneauFilter={creneauFilter}
          onCreneauFilterChange={setCreneauFilter}
          selectedMedecin={selectedMedecin}
          onMedecinFilterChange={setSelectedMedecin}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          medecins={medecins}
          creneaux={creneaux}
        />

        {/* Panneau d'information médecin */}
        {selectedMedecin !== 'all' && (
          <MedecinInfoPanel
            medecin={medecins.find(m => m.id === selectedMedecin)}
            planning={planning}
            desiderata={desiderata}
          />
        )}

        {/* Table du planning */}
        {planning && (
          <PlanningTable
            planning={planning}
            creneaux={creneaux}
            medecins={medecins}
            desiderata={desiderata}
            selectedMedecin={selectedMedecin}
            editMode={editMode}
            onMedecinChange={handleMedecinChange}
            dateFilter={dateFilter}
            creneauFilter={creneauFilter}
          />
        )}
      </main>

      {/* Modales */}
      <GeneratePlanningModal
        isOpen={showGenerateConfirm}
        onClose={() => setShowGenerateConfirm(false)}
        onConfirm={handleGeneratePlanning}
        planning={planning}
      />

      <PublishPlanningModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishPlanning}
        publishedPlanning={publishedPlanning}
      />

      <DiscardChangesModal
        isOpen={showDiscardChanges}
        onClose={() => setShowDiscardChanges(false)}
        onConfirm={() => {
          setShowDiscardChanges(false);
          setModified(false);
          setEditMode(false);
        }}
      />

      <ExportDesiderataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        medecins={medecins}
        desiderata={desiderata}
        periodeSaisie={periodeSaisie}
        creneaux={creneaux}
      />
    </div>
  );
}

export default GestionPlanning;