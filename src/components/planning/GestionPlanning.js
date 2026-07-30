// src/components/planning/GestionPlanning.js
import React, { useState, useEffect, useMemo, useRef, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { creneaux } from '../../utils/planningCore';
import {
  indexerDesiderata,
  analyserPlanning,
  reducerEdition,
  etatEditionInitial
} from '../../utils/planningEdition';
import { genererPlanningPriorite } from '../../utils/planningGeneratorPriorite';
import { LoadingScreen, Alert } from '../ui';
import logger from '../../utils/logger';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning';
import useUndoShortcut from '../../hooks/useUndoShortcut';

// Import des sous-composants
import PlanningHeader from './PlanningHeader';
import PlanningFilters from './PlanningFilters';
import PlanningStatistics from './PlanningStatistics';
import PlanningCoverageBar from './PlanningCoverageBar';
import PlanningTable, { idSlot } from './PlanningTable';
import MedecinInfoPanel from './MedecinInfoPanel';
import GeneratePlanningModal from './modals/GeneratePlanningModal';
import PublishPlanningModal from './modals/PublishPlanningModal';
import DiscardChangesModal from './modals/DiscardChangesModal';
import ExportDesiderataModal from '../ExportDesiderataModal';
import ExportPlanningModal from '../ExportPlanningModal';

// Rang d'un créneau dans l'ordre canonique de la journée (navigation « place vide
// suivante » : on parcourt les trous dans l'ordre où l'admin les lit).
const RANG_CRENEAU = creneaux.reduce((acc, c, i) => ({ ...acc, [c.id]: i }), {});
const comparerPlaces = (a, b) =>
  a.date.localeCompare(b.date)
  || (RANG_CRENEAU[a.creneauId] - RANG_CRENEAU[b.creneauId])
  || (a.index - b.index);

function GestionPlanning() {
  // Données
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [publishedPlanning, setPublishedPlanning] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [desiderata, setDesiderata] = useState([]);

  const [etat, dispatch] = useReducer(reducerEdition, etatEditionInitial);
  const { planning, historique } = etat;
  const modified = historique.length > 0;

  // Interface
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [creneauFilter, setCreneauFilter] = useState('all');
  const [selectedMedecin, setSelectedMedecin] = useState('all');
  const [seulementIncomplets, setSeulementIncomplets] = useState(false);

  // Modales
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDiscardChanges, setShowDiscardChanges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportPlanningModal, setShowExportPlanningModal] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);

  const navigate = useNavigate();
  const notifTimer = useRef(null);
  const dernierVideRef = useRef(null);

  useUnsavedChangesWarning(editMode && modified);

  // Chargement initial (auth + rôle admin garantis par ProtectedRoute)
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
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
          dispatch({ type: 'charger', planning: latestPlan });
          // Le filtre « Période » SUIT le planning affiché (la période générée) : il
          // se cale sur ses dates au chargement, et est remis à jour à chaque nouvelle
          // génération (voir handleGeneratePlanning) → filtre et planning toujours alignés.
          setDateFilter({
            start: latestPlan.startDate.split('T')[0],
            end: latestPlan.endDate.split('T')[0]
          });
        }

        setPublishedPlanning(publishedPlan);

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

  useEffect(() => () => clearTimeout(notifTimer.current), []);

  // --- Index et analyse : calculés UNE fois par changement, pas par cellule ---
  // Le mode édition monte plus de 1 000 sélecteurs ; chacun refaisait auparavant
  // un `Array.find()` sur les 41 fiches de desiderata à chaque rendu.
  const medecinsTries = useMemo(
    () => [...medecins].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr')),
    [medecins]
  );
  const medecinsById = useMemo(() => new Map(medecins.map((m) => [m.id, m])), [medecins]);
  const idxDesiderata = useMemo(() => indexerDesiderata(desiderata), [desiderata]);
  const analyse = useMemo(
    () => (planning ? analyserPlanning(planning, idxDesiderata) : null),
    [planning, idxDesiderata]
  );

  const showNotification = useCallback((message, isError = false) => {
    clearTimeout(notifTimer.current);
    if (isError) { setError(message); setSuccess(null); }
    else { setSuccess(message); setError(null); }
    notifTimer.current = setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  }, []);

  // --- Actions principales ---
  const handleGeneratePlanning = async (listePriorite = null) => {
    setLoading(true);
    try {
      if (!periodeSaisie) { throw new Error('Période de saisie non définie'); }
      if (!listePriorite) { throw new Error("Liste d'ordre de choix manquante"); }

      const { startDate, endDate } = periodeSaisie;
      const newPlanningData = await genererPlanningPriorite(startDate, endDate, listePriorite);
      logger.info('Planning généré par ordre de priorité', { listePriorite });

      let nouveau;
      if (planning && planning.id) {
        // La génération porte TOUJOURS sur la période de saisie active : on recale
        // aussi les bornes du document, sinon un planning issu d'une période
        // antérieure garderait des dates qui ne décrivent plus son contenu.
        nouveau = { ...planning, planning: newPlanningData, startDate, endDate };
        await updatePlanning(planning.id, nouveau);
      } else {
        const savedPlanningId = await savePlanning({
          planning: newPlanningData,
          startDate,
          endDate
        });
        nouveau = { id: savedPlanningId, planning: newPlanningData, startDate, endDate };
      }
      dispatch({ type: 'remplacer', planning: nouveau });
      dernierVideRef.current = null;
      // Le filtre « Période » suit le planning affiché (cf. chargement initial) : sans
      // ce recalage, un filtre hérité d'une période antérieure masquerait le planning
      // qu'on vient de générer.
      setDateFilter({ start: startDate.split('T')[0], end: endDate.split('T')[0] });

      showNotification('Planning généré avec succès par ordre de priorité');
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
      if (!planning || !planning.id) { throw new Error('Aucun planning à publier'); }
      // Publier envoie aux médecins ce qui est ENREGISTRÉ, pas ce qui est à
      // l'écran : on refuse tant que des modifications ne sont pas sauvegardées.
      if (modified) { throw new Error('Modifications non sauvegardées'); }

      await publishPlanning(planning.id);
      setPublishedPlanning(await getPublishedPlanning());
      showNotification('Planning publié avec succès');
      setShowPublishConfirm(false);
    } catch (error) {
      logger.error('Erreur lors de la publication:', error);
      showNotification(
        error.message === 'Modifications non sauvegardées'
          ? 'Sauvegardez vos modifications avant de publier.'
          : 'Erreur lors de la publication du planning',
        true
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      if (!planning || !planning.id) { throw new Error('Aucun planning à sauvegarder'); }
      await updatePlanning(planning.id, planning);
      dispatch({ type: 'pointStable' });
      showNotification('Modifications sauvegardées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde:', error);
      showNotification('Erreur lors de la sauvegarde des modifications', true);
    } finally {
      setLoading(false);
    }
  };

  // `dispatch` est stable : l'identité de ce handler ne change jamais, ce qui
  // permet à React.memo de neutraliser le rendu des ~1 000 sélecteurs inchangés.
  const handleMedecinChange = useCallback((date, creneau, index, medecinId) => {
    dispatch({ type: 'affecter', date, creneau, index, medecinId });
  }, []);

  const annulerDerniereAction = useCallback(() => {
    dispatch({ type: 'annulerAction' });
  }, []);

  useUndoShortcut(editMode, annulerDerniereAction);

  const toggleEditMode = () => {
    if (editMode && modified) {
      setShowDiscardChanges(true);
      return;
    }
    if (!editMode) { dispatch({ type: 'pointStable' }); }
    setEditMode(!editMode);
  };

  const abandonnerModifications = () => {
    setShowDiscardChanges(false);
    dispatch({ type: 'abandonner' });
    setEditMode(false);
    if (pendingBack) {
      setPendingBack(false);
      navigate('/dashboard-admin');
    }
  };

  const handleBack = () => {
    if (editMode && modified) {
      setPendingBack(true);
      setShowDiscardChanges(true);
      return;
    }
    navigate('/dashboard-admin');
  };

  // Amène à l'écran la prochaine place non pourvue, dans l'ordre de lecture.
  const allerPlaceVideSuivante = useCallback(() => {
    const vides = analyse?.placesVides || [];
    if (vides.length === 0) { return; }
    const precedente = dernierVideRef.current;
    const suivante =
      (precedente && vides.find((v) => comparerPlaces(v, precedente) > 0)) || vides[0];

    const el = document.getElementById(idSlot(suivante.date, suivante.creneauId, suivante.index));
    if (!el) {
      showNotification(
        'La prochaine place vide est masquée par les filtres — élargissez la période ou le créneau.',
        true
      );
      return;
    }
    dernierVideRef.current = suivante;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('button')?.focus({ preventScroll: true });
  }, [analyse, showNotification]);

  if (loading) {
    return <LoadingScreen message="Chargement du planning…" />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <PlanningHeader
        editMode={editMode}
        modified={modified}
        nombreModifications={historique.length}
        onUndo={annulerDerniereAction}
        onEditToggle={toggleEditMode}
        onGenerateClick={() => setShowGenerateConfirm(true)}
        onPublishClick={() => setShowPublishConfirm(true)}
        onSaveChanges={handleSaveChanges}
        onBackClick={handleBack}
        onExportClick={() => setShowExportModal(true)}
        onExportPlanningClick={() => setShowExportPlanningModal(true)}
        planning={planning}
      />

      {(error || success) && (
        <div className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
          {error && <Alert kind="error">{error}</Alert>}
          {success && <Alert kind="success">{success}</Alert>}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 animate-fade-up">
        {/* Le bandeau de remplissage passe AVANT les statistiques : c'est
            l'information sur laquelle l'admin agit, et sur mobile les trois
            cartes de statistiques repoussaient tout le reste hors écran. */}
        {planning && (
          <PlanningCoverageBar
            analyse={analyse}
            seulementIncomplets={seulementIncomplets}
            onToggleIncomplets={() => setSeulementIncomplets((v) => !v)}
            onPlaceVideSuivante={allerPlaceVideSuivante}
          />
        )}

        <PlanningStatistics
          medecins={medecins}
          periodeSaisie={periodeSaisie}
          planning={planning}
          publishedPlanning={publishedPlanning}
        />

        <PlanningFilters
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          creneauFilter={creneauFilter}
          onCreneauFilterChange={setCreneauFilter}
          selectedMedecin={selectedMedecin}
          onMedecinFilterChange={setSelectedMedecin}
          medecins={medecinsTries}
          creneaux={creneaux}
        />

        {selectedMedecin !== 'all' && (
          <MedecinInfoPanel
            medecin={medecinsById.get(selectedMedecin)}
            idxDesiderata={idxDesiderata}
            analyse={analyse}
          />
        )}

        {planning && analyse && (
          <PlanningTable
            planning={planning}
            creneaux={creneaux}
            medecins={medecinsTries}
            medecinsById={medecinsById}
            idxDesiderata={idxDesiderata}
            idxPlanning={analyse}
            problemesParSlot={analyse.problemesParSlot}
            selectedMedecin={selectedMedecin}
            editMode={editMode}
            onMedecinChange={handleMedecinChange}
            dateFilter={dateFilter}
            creneauFilter={creneauFilter}
            seulementIncomplets={seulementIncomplets}
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
        analyse={analyse}
        modificationsNonSauvegardees={modified}
      />

      <DiscardChangesModal
        isOpen={showDiscardChanges}
        onClose={() => {
          setShowDiscardChanges(false);
          setPendingBack(false);
        }}
        onConfirm={abandonnerModifications}
        nombreModifications={historique.length}
      />

      <ExportDesiderataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        medecins={medecins}
        desiderata={desiderata}
        periodeSaisie={periodeSaisie}
      />

      <ExportPlanningModal
        isOpen={showExportPlanningModal}
        onClose={() => setShowExportPlanningModal(false)}
        planning={planning}
        medecins={medecins}
      />
    </div>
  );
}

export default GestionPlanning;
