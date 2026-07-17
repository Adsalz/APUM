// src/components/planning/GestionPlanning.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { getMedecins } from '../../services/userService';
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
import { genererPlanningPriorite } from '../../utils/planningGeneratorPriorite';
import { LoadingScreen, Alert } from '../ui';
import logger from '../../utils/logger';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning';

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

function GestionPlanning() {
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
  // Navigation en attente d'une confirmation d'abandon des modifications.
  const [pendingBack, setPendingBack] = useState(false);

  const history = useHistory();

  // Avertit avant de quitter/recharger l'onglet si des modifications sont en cours.
  useUnsavedChangesWarning(editMode && modified);

  // Effet pour charger les données initiales
  // (auth + rôle admin garantis par ProtectedRoute)
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        // Chargement des données de base
        const [periode, medecinsList, latestPlan, publishedPlan] = await Promise.all([
          getPeriodeSaisie(),
          getMedecins(),
          getLatestPlanning(),
          getPublishedPlanning()
        ]);
        if (cancelled) { return; }

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
          if (cancelled) { return; }
          setDesiderata(desiderataData);
        }

      } catch (error) {
        if (cancelled) { return; }
        logger.error('Erreur:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

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
  const handleGeneratePlanning = async (modeGeneration = 'classique', listePriorite = null) => {
    setLoading(true);
    try {
      if (!periodeSaisie) {
        throw new Error('Période de saisie non définie');
      }

      let newPlanningData;

      if (modeGeneration === 'priorite' && listePriorite) {
        newPlanningData = await genererPlanningPriorite(
          periodeSaisie.startDate,
          periodeSaisie.endDate,
          listePriorite
        );
        logger.info('Planning généré en mode priorité', { listePriorite });
      } else {
        newPlanningData = await genererPlanning(
          periodeSaisie.startDate,
          periodeSaisie.endDate
        );
        logger.info('Planning généré en mode classique');
      }

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

      const modeMessage = modeGeneration === 'priorite' ? 'par ordre de priorité' : 'en mode classique';
      showNotification(`Planning généré avec succès ${modeMessage}`);
      setModified(false);
      setShowGenerateConfirm(false);
    } catch (error) {
      logger.error('Erreur lors de la génération du planning:', error);
      showNotification('Erreur lors de la génération du planning', true);
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
      logger.error('Erreur lors de la publication:', error);
      showNotification('Erreur lors de la publication du planning', true);
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
      logger.error('Erreur lors de la sauvegarde:', error);
      showNotification('Erreur lors de la sauvegarde des modifications', true);
    } finally {
      setLoading(false);
    }
  };

  const handleMedecinChange = (date, creneau, index, medecinId) => {
    if (!editMode) {return;}

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

  // Retour au tableau de bord : demande confirmation si des modifications
  // d'édition ne sont pas sauvegardées.
  const handleBack = () => {
    if (editMode && modified) {
      setPendingBack(true);
      setShowDiscardChanges(true);
      return;
    }
    history.push('/dashboard-admin');
  };

  if (loading) {
    return <LoadingScreen message="Chargement du planning…" />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* En-tête */}
      <PlanningHeader
        editMode={editMode}
        modified={modified}
        onEditToggle={toggleEditMode}
        onGenerateClick={() => setShowGenerateConfirm(true)}
        onPublishClick={() => setShowPublishConfirm(true)}
        onSaveChanges={handleSaveChanges}
        onBackClick={handleBack}
        onExportClick={() => setShowExportModal(true)}
        planning={planning}
      />

      {/* Notifications */}
      {(error || success) && (
        <div className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
          {error && <Alert kind="error">{error}</Alert>}
          {success && <Alert kind="success">{success}</Alert>}
        </div>
      )}

      {/* Contenu principal */}
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 animate-fade-up">
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
        medecins={medecins}
      />

      <PublishPlanningModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishPlanning}
        publishedPlanning={publishedPlanning}
      />

      <DiscardChangesModal
        isOpen={showDiscardChanges}
        onClose={() => {
          setShowDiscardChanges(false);
          setPendingBack(false);
        }}
        onConfirm={() => {
          setShowDiscardChanges(false);
          setModified(false);
          setEditMode(false);
          if (pendingBack) {
            setPendingBack(false);
            history.push('/dashboard-admin');
          }
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