// src/components/FormulaireDesirata.js
// Écran médecin : saisie de ses propres desiderata.
// La logique et la présentation communes sont factorisées dans
// ./desiderata (useDesiderataForm, DesiderataPreferences, DesiderataTable).
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDesiderata,
  getPeriodeSaisie,
  getDesiderataByUser,
  getPublishedPlanning,
  updateDesiderata,
} from '../services/planningService';
import { exportMedecinDesiderataToExcel } from '../services/excelExportService';
import logger from '../utils/logger';
import { ROUTE_PLANNING } from '../utils/accueilMedecin';
import { Save, Download, CalendarRange, CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader, LoadingScreen, ErrorScreen, Button, Badge, useToast } from './ui';
import QuickFill from './QuickFill';
import WeeklyPattern from './WeeklyPattern';
import useUnsavedChangesWarning from '../hooks/useUnsavedChangesWarning';
import useBlockNavigation from '../hooks/useBlockNavigation';
import { CRENEAUX as creneaux } from '../constants/creneaux';
import useDesiderataForm from './desiderata/useDesiderataForm';
import DesiderataPreferences from './desiderata/DesiderataPreferences';
import DesiderataTable from './desiderata/DesiderataTable';

function FormulaireDesirata() {
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Un planning publié existe-t-il ? Le médecin n'a pas de tableau de bord d'où
  // rebondir : sans ce raccourci dans l'en-tête, le planning du trimestre en
  // cours devient inatteignable pendant la saisie du trimestre suivant.
  const [planningPublie, setPlanningPublie] = useState(false);

  const { profile, role } = useAuth();
  const user = profile;
  const toast = useToast();
  const navigate = useNavigate();

  const {
    desiderata,
    preferences,
    isDirty,
    setIsDirty,
    filledCount,
    generateDates,
    handleDesiderataChange,
    handleQuickFill,
    handleApplyPattern,
    setPreference,
    hydrate,
    buildPayload,
  } = useDesiderataForm(periodeSaisie);

  // Avertit avant fermeture/rechargement de l'onglet + bloque la navigation interne.
  useUnsavedChangesWarning(isDirty);
  useBlockNavigation(
    isDirty,
    'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?'
  );

  useEffect(() => {
    if (!profile) { return undefined; }

    let cancelled = false;
    const fetchData = async () => {
      try {
        const periode = await getPeriodeSaisie();
        if (cancelled) { return; }
        if (periode) {
          setPeriodeSaisie(periode);
          const userDesiderata = await getDesiderataByUser(profile.id);
          if (cancelled) { return; }
          const relevant = userDesiderata.find(
            (d) =>
              new Date(d.startDate) <= new Date(periode.endDate) &&
              new Date(d.endDate) >= new Date(periode.startDate)
          );
          if (relevant) {
            setExistingDesiderataId(relevant.id);
            hydrate(relevant, false);
          }
          // Best-effort : un échec ne prive que du raccourci vers le planning.
          const publie = await getPublishedPlanning().catch((err) => {
            logger.error('Lecture du planning publié impossible:', err);
            return null;
          });
          if (cancelled) { return; }
          setPlanningPublie(Boolean(publie));
        } else {
          setError('Aucune période de saisie n\'a été définie par l\'administrateur.');
        }
      } catch (err) {
        if (cancelled) { return; }
        logger.error('Erreur lors de la récupération des données:', err);
        setError('Erreur lors de la récupération des données: ' + err.message);
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [profile, hydrate]);

  const onQuickFill = (args) => {
    handleQuickFill(args);
    toast.info('Remplissage rapide appliqué.');
  };
  const onApplyPattern = (pattern, startDate, endDate) => {
    handleApplyPattern(pattern, startDate, endDate);
    toast.info('Modèle hebdomadaire appliqué.');
  };

  const handleSubmit = async (e) => {
    if (e) { e.preventDefault(); }
    if (user && !isSaving) {
      setIsSaving(true);
      try {
        if (!periodeSaisie || !periodeSaisie.startDate || !periodeSaisie.endDate) {
          throw new Error('Période de saisie non définie');
        }
        const payload = buildPayload();
        if (existingDesiderataId) {
          await updateDesiderata(existingDesiderataId, payload);
          toast.success('Desiderata mis à jour avec succès !');
        } else {
          const newId = await addDesiderata(user.id, payload);
          if (newId) { setExistingDesiderataId(newId); }
          toast.success('Desiderata enregistrés avec succès !');
        }
        setIsDirty(false);
      } catch (err) {
        logger.error('Erreur lors de la soumission des desiderata:', err);
        toast.error('Erreur lors de l\'enregistrement : ' + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleExportExcel = async () => {
    if (!user || !periodeSaisie) { return; }
    setIsExporting(true);
    try {
      const current = { userId: user.id, ...buildPayload() };
      const result = await exportMedecinDesiderataToExcel(user, current, periodeSaisie);
      toast.success(result.message || 'Export Excel réussi.');
    } catch (err) {
      logger.error('Erreur lors de l\'export Excel:', err);
      toast.error('Erreur lors de l\'export Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Chargement de vos desiderata…" />;
  }
  if (error) {
    return <ErrorScreen message={error} />;
  }

  const dates = generateDates();

  return (
    <div className="min-h-screen bg-ink-100">
      <AppHeader
        backTo={role === 'admin' ? '/dashboard-admin' : undefined}
        actions={
          <>
            {planningPublie && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(ROUTE_PLANNING)}
                icon={<CalendarDays size={16} />}
                title="Consulter le planning publié"
              >
                <span className="hidden sm:inline">Planning</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              loading={isExporting}
              icon={<Download size={16} />}
              title="Exporter mes desiderata vers Excel"
            >
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleSubmit}
              loading={isSaving}
              icon={<Save size={16} />}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 animate-fade-up">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Mes desiderata
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <Badge tone="primary">
              <CalendarRange size={13} />
              {new Date(periodeSaisie.startDate).toLocaleDateString('fr-FR')} –{' '}
              {new Date(periodeSaisie.endDate).toLocaleDateString('fr-FR')}
            </Badge>
            <span>·</span>
            <span>
              {dates.length} jours · {filledCount} choix renseignés
            </span>
          </div>
        </div>

        <DesiderataPreferences preferences={preferences} onChange={setPreference} />

        <div className="mb-6 grid gap-4">
          <QuickFill creneaux={creneaux} onApply={onQuickFill} periodeSaisie={periodeSaisie} />
          <WeeklyPattern creneaux={creneaux} onApplyPattern={onApplyPattern} periodeSaisie={periodeSaisie} />
        </div>

        <DesiderataTable
          dates={dates}
          creneaux={creneaux}
          desiderata={desiderata}
          onChange={handleDesiderataChange}
        />

        <div className="mt-6 flex justify-end">
          <Button
            variant="success"
            size="lg"
            onClick={handleSubmit}
            loading={isSaving}
            icon={<Save size={18} />}
          >
            Enregistrer mes desiderata
          </Button>
        </div>
      </main>
    </div>
  );
}

export default FormulaireDesirata;
