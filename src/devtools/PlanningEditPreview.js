// src/devtools/PlanningEditPreview.js
// DEV UNIQUEMENT (route montée seulement si NODE_ENV === 'development').
// Rejoue l'écran « Gestion du planning » — mêmes composants, même réducteur —
// sur des données FICTIVES, sans Firebase ni authentification.
// But : observer, mesurer et capturer le parcours d'ÉDITION en local.
//
// Paramètres d'URL : ?days=92&edit=1&medecin=med-03&creneau=QUART_2
import React, { useMemo, useState, useRef, useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { creneaux } from '../utils/planningCore';
import {
  indexerDesiderata,
  analyserPlanning,
  reducerEdition,
  etatEditionInitial
} from '../utils/planningEdition';
import PlanningHeader from '../components/planning/PlanningHeader';
import PlanningFilters from '../components/planning/PlanningFilters';
import PlanningStatistics from '../components/planning/PlanningStatistics';
import PlanningCoverageBar from '../components/planning/PlanningCoverageBar';
import PlanningTable, { idSlot } from '../components/planning/PlanningTable';
import MedecinInfoPanel from '../components/planning/MedecinInfoPanel';
import PublishPlanningModal from '../components/planning/modals/PublishPlanningModal';
import DiscardChangesModal from '../components/planning/modals/DiscardChangesModal';
import useUndoShortcut from '../hooks/useUndoShortcut';
import { construireFixtures } from './planningFixtures';

const RANG_CRENEAU = creneaux.reduce((acc, c, i) => ({ ...acc, [c.id]: i }), {});
const comparerPlaces = (a, b) =>
  a.date.localeCompare(b.date)
  || (RANG_CRENEAU[a.creneauId] - RANG_CRENEAU[b.creneauId])
  || (a.index - b.index);

function PlanningEditPreview() {
  const [params] = useSearchParams();
  const nbJours = Number(params.get('days') || 92);
  const seed = Number(params.get('seed') || 20260801);

  const fixtures = useMemo(() => construireFixtures({ nbJours, seed }), [nbJours, seed]);

  const [etat, dispatch] = useReducer(reducerEdition, {
    ...etatEditionInitial, planning: fixtures.planning, reference: fixtures.planning
  });
  const { planning, historique } = etat;
  const modified = historique.length > 0;

  const [editMode, setEditMode] = useState(params.get('edit') === '1');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    start: fixtures.periodeSaisie.startDate,
    end: fixtures.periodeSaisie.endDate
  });
  const [creneauFilter, setCreneauFilter] = useState(params.get('creneau') || 'all');
  const [selectedMedecin, setSelectedMedecin] = useState(params.get('medecin') || 'all');
  const [seulementIncomplets, setSeulementIncomplets] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [renderMs, setRenderMs] = useState(null);
  const dernierVideRef = useRef(null);

  useEffect(() => { dispatch({ type: 'charger', planning: fixtures.planning }); }, [fixtures]);

  const medecinsTries = useMemo(
    () => [...fixtures.medecins].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [fixtures]
  );
  const medecinsById = useMemo(
    () => new Map(fixtures.medecins.map((m) => [m.id, m])), [fixtures]
  );
  const idxDesiderata = useMemo(() => indexerDesiderata(fixtures.desiderata), [fixtures]);
  const analyse = useMemo(
    () => (planning ? analyserPlanning(planning, idxDesiderata) : null),
    [planning, idxDesiderata]
  );

  const annulerDerniereAction = useCallback(() => dispatch({ type: 'annulerAction' }), []);
  useUndoShortcut(editMode, annulerDerniereAction);

  const handleMedecinChange = useCallback((date, creneau, index, medecinId) => {
    const t0 = performance.now();
    dispatch({ type: 'affecter', date, creneau, index, medecinId });
    requestAnimationFrame(() => setRenderMs(Math.round(performance.now() - t0)));
  }, []);

  const allerPlaceVideSuivante = useCallback(() => {
    const vides = analyse?.placesVides || [];
    if (vides.length === 0) { return; }
    const precedente = dernierVideRef.current;
    const suivante = (precedente && vides.find((v) => comparerPlaces(v, precedente) > 0)) || vides[0];
    const el = document.getElementById(idSlot(suivante.date, suivante.creneauId, suivante.index));
    if (!el) { return; }
    dernierVideRef.current = suivante;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('button')?.focus({ preventScroll: true });
  }, [analyse]);

  return (
    <div className="min-h-screen bg-ink-50">
      <PlanningHeader
        editMode={editMode}
        modified={modified}
        nombreModifications={historique.length}
        onUndo={annulerDerniereAction}
        onEditToggle={() => {
          if (editMode && modified) { setShowDiscard(true); return; }
          if (!editMode) { dispatch({ type: 'pointStable' }); }
          setEditMode((v) => !v);
        }}
        onGenerateClick={() => {}}
        onPublishClick={() => setShowPublish(true)}
        onSaveChanges={() => dispatch({ type: 'pointStable' })}
        onBackClick={() => {}}
        onExportClick={() => {}}
        onExportPlanningClick={() => {}}
        planning={planning}
      />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6">
        <div
          data-testid="harness-banner"
          className="mb-4 rounded-xl border border-dashed border-primary-300 bg-primary-50 px-4 py-2 text-xs text-primary-800"
        >
          <strong>HARNAIS DEV</strong> — données fictives · {fixtures.medecins.length} médecins ·{' '}
          {Object.keys(planning.planning).length} jours
          {renderMs !== null && (
            <span data-testid="harness-render-ms"> · dernier changement rendu en {renderMs} ms</span>
          )}
        </div>

        <PlanningCoverageBar
          analyse={analyse}
          seulementIncomplets={seulementIncomplets}
          onToggleIncomplets={() => setSeulementIncomplets((v) => !v)}
          onPlaceVideSuivante={allerPlaceVideSuivante}
        />

        <PlanningStatistics
          medecins={fixtures.medecins}
          periodeSaisie={fixtures.periodeSaisie}
          planning={planning}
          publishedPlanning={null}
        />

        <PlanningFilters
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
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

        {analyse && (
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

      <PublishPlanningModal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        onConfirm={() => setShowPublish(false)}
        publishedPlanning={null}
        analyse={analyse}
        modificationsNonSauvegardees={modified}
      />
      <DiscardChangesModal
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={() => {
          setShowDiscard(false);
          dispatch({ type: 'abandonner' });
          setEditMode(false);
        }}
        nombreModifications={historique.length}
      />
    </div>
  );
}

export default PlanningEditPreview;
