// src/components/FormulaireDesiderataAdmin.js
// Écran administrateur : saisir/modifier les desiderata d'un médecin choisi,
// avec import JSON. Partage la logique et la présentation avec l'écran médecin
// via ./desiderata (useDesiderataForm, DesiderataPreferences, DesiderataTable).
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMedecins } from '../services/userService';
import {
  addDesiderata,
  getPeriodeSaisie,
  getDesiderataByUser,
  updateDesiderata,
} from '../services/planningService';
import { importDesiderataFromExcel } from '../services/excelImportService';
import logger from '../utils/logger';
import { Calendar, Save, Upload, CalendarRange, Users } from 'lucide-react';
import QuickFill from './QuickFill';
import WeeklyPattern from './WeeklyPattern';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Alert,
  Button,
  Card,
  Modal,
  Badge,
  Select,
  useToast,
} from './ui';
import { useAuth } from '../contexts/AuthContext';
import useUnsavedChangesWarning from '../hooks/useUnsavedChangesWarning';
import useBlockNavigation from '../hooks/useBlockNavigation';
import { CRENEAUX as creneaux } from '../constants/creneaux';
import useDesiderataForm from './desiderata/useDesiderataForm';
import DesiderataPreferences from './desiderata/DesiderataPreferences';
import DesiderataTable from './desiderata/DesiderataTable';

function FormulaireDesiderataAdmin() {
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecinId, setSelectedMedecinId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  // Médecin vers lequel basculer, en attente de confirmation d'abandon.
  const [pendingMedecinId, setPendingMedecinId] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

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
    reset,
    buildPayload,
  } = useDesiderataForm(periodeSaisie);

  useUnsavedChangesWarning(isDirty);
  useBlockNavigation(
    isDirty,
    'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?'
  );

  // Chargement initial : liste des médecins + période de saisie.
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const medecinsList = await getMedecins();
        if (cancelled) { return; }
        setMedecins(medecinsList);

        const periode = await getPeriodeSaisie();
        if (cancelled) { return; }
        if (periode) {
          setPeriodeSaisie(periode);
        } else {
          setError('Aucune période de saisie n\'a été définie.');
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
  }, []);

  // Chargement des desiderata du médecin sélectionné.
  useEffect(() => {
    let cancelled = false;
    const loadMedecinDesiderata = async () => {
      if (!selectedMedecinId || !periodeSaisie) {
        reset();
        setExistingDesiderataId(null);
        return;
      }
      try {
        const userDesiderata = await getDesiderataByUser(selectedMedecinId);
        if (cancelled) { return; }
        const relevant = userDesiderata.find(
          (d) =>
            new Date(d.startDate) <= new Date(periodeSaisie.endDate) &&
            new Date(d.endDate) >= new Date(periodeSaisie.startDate)
        );
        if (relevant) {
          setExistingDesiderataId(relevant.id);
          hydrate(relevant, false);
        } else {
          setExistingDesiderataId(null);
          reset();
        }
      } catch (err) {
        if (cancelled) { return; }
        logger.error('Erreur lors du chargement des desiderata du médecin:', err);
      }
    };
    loadMedecinDesiderata();
    return () => { cancelled = true; };
  }, [selectedMedecinId, periodeSaisie, hydrate, reset]);

  // Import d'une fiche de desiderata : JSON (export de l'appli) ou Excel
  // (la « fiche vierge » remplie et renvoyée par un médecin).
  const applyImportedData = (importedData) => {
    hydrate(importedData, true);
    const jours = Object.keys(importedData.desiderata).length;
    // Rien n'est enregistré ici : l'admin relit la grille puis valide.
    toast.success(
      `${jours} jour${jours > 1 ? 's' : ''} chargé${jours > 1 ? 's' : ''}. `
      + 'Vérifiez la grille, puis enregistrez.'
    );
  };

  // Lit une fiche Excel et la ramène à la forme attendue par le formulaire.
  const lireFichierExcel = async (file) => {
    const lu = await importDesiderataFromExcel(file);

    // Les dates hors de la période en cours ne s'afficheraient pas : on prévient
    // plutôt que de laisser croire à un import complet.
    const dansLaPeriode = Object.keys(lu.desiderata).filter(
      (date) => date >= periodeSaisie.startDate.split('T')[0]
        && date <= periodeSaisie.endDate.split('T')[0]
    ).length;
    if (dansLaPeriode === 0) {
      throw new Error(
        'Aucune date de ce fichier ne tombe dans la période de saisie en cours. '
        + 'S\'agit-il de la fiche du bon trimestre ?'
      );
    }
    const horsPeriode = Object.keys(lu.desiderata).length - dansLaPeriode;
    if (horsPeriode > 0) {
      toast.warning(`${horsPeriode} jour(s) hors période de saisie ont été ignorés.`);
    }
    if (lu.stats.casesIllisibles > 0) {
      toast.warning(
        `${lu.stats.casesIllisibles} case(s) ignorée(s) : réponse autre que Oui, Possible ou Non.`
      );
    }

    // Une préférence absente de la fiche garde sa valeur par défaut.
    return {
      desiderata: lu.desiderata,
      nombreGardesSouhaitees: lu.nombreGardesSouhaitees ?? 0,
      gardesGroupees: lu.gardesGroupees ?? false,
      renfortsAssocies: lu.renfortsAssocies ?? false,
    };
  };

  const lireFichierJson = async (file) => {
    const importedData = JSON.parse(await file.text());
    if (!importedData.desiderata || typeof importedData.desiderata !== 'object') {
      throw new Error('Structure JSON invalide : le champ « desiderata » est manquant.');
    }
    return importedData;
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) { return; }

    const estExcel = file.name.toLowerCase().endsWith('.xlsx');
    const estJson = file.name.toLowerCase().endsWith('.json');

    if (!selectedMedecinId) {
      toast.warning('Veuillez d\'abord sélectionner un médecin');
      event.target.value = '';
      return;
    }
    if (!estExcel && !estJson) {
      toast.error('Le fichier doit être une fiche Excel (.xlsx) ou un export JSON');
      event.target.value = '';
      return;
    }

    try {
      const importedData = estExcel
        ? await lireFichierExcel(file)
        : await lireFichierJson(file);
      event.target.value = '';
      // Si des desiderata existent déjà, confirmer avant de remplacer.
      if (existingDesiderataId) {
        setPendingImport(importedData);
        return;
      }
      applyImportedData(importedData);
    } catch (err) {
      logger.error('Erreur lors de l\'import du fichier:', err);
      toast.error(err.message || 'Erreur lors de la lecture du fichier');
      event.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (pendingImport) { applyImportedData(pendingImport); }
    setPendingImport(null);
  };
  const handleCancelImport = () => setPendingImport(null);

  // Changement de médecin : confirmer si des modifications ne sont pas enregistrées.
  const handleMedecinSelectChange = (e) => {
    const newId = e.target.value;
    if (isDirty && selectedMedecinId && newId !== selectedMedecinId) {
      setPendingMedecinId(newId);
      return;
    }
    setSelectedMedecinId(newId);
  };
  const confirmMedecinSwitch = () => {
    setSelectedMedecinId(pendingMedecinId || '');
    setPendingMedecinId(null);
  };

  const handleSubmit = async (e) => {
    if (e) { e.preventDefault(); }
    if (!selectedMedecinId) {
      toast.warning('Veuillez sélectionner un médecin');
      return;
    }
    if (profile && !isSaving) {
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
          await addDesiderata(selectedMedecinId, payload);
          toast.success('Desiderata soumis avec succès !');
        }
        // Plus de modifications en attente → ne pas bloquer la navigation.
        setIsDirty(false);
        // Laisser le temps de voir le message avant de revenir au tableau de bord.
        setTimeout(() => navigate('/dashboard-admin'), 1500);
      } catch (err) {
        logger.error('Erreur lors de la soumission des desiderata:', err);
        setIsSaving(false);
        toast.error('Une erreur est survenue lors de la soumission des desiderata: ' + err.message);
      }
    }
  };

  const selectedMedecin = medecins.find((m) => m.id === selectedMedecinId);

  if (loading) {
    return <LoadingScreen message="Chargement des desiderata…" />;
  }
  if (error) {
    return <ErrorScreen message={error} />;
  }

  const dates = generateDates();

  return (
    <div className="min-h-screen bg-ink-100">
      <AppHeader
        backTo="/dashboard-admin"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              title="Importer une fiche remplie : Excel (.xlsx) renvoyé par un médecin, ou export JSON"
            >
              <span className="hidden sm:inline">Importer une fiche</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.json"
              onChange={handleFileImport}
              className="hidden"
            />
            <Button
              variant="success"
              size="sm"
              icon={<Save size={16} />}
              onClick={handleSubmit}
              disabled={!selectedMedecinId}
              loading={isSaving}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      {/* Confirmation de remplacement des desiderata par un import */}
      <Modal
        open={!!pendingImport}
        onClose={handleCancelImport}
        title="Remplacer les desiderata ?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={handleCancelImport}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleConfirmImport}>
              Confirmer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Ce médecin a déjà des desiderata saisis. Voulez-vous les remplacer par les données importées ?
        </p>
      </Modal>

      {/* Confirmation avant de changer de médecin (saisie non enregistrée) */}
      <Modal
        open={!!pendingMedecinId}
        onClose={() => setPendingMedecinId(null)}
        title="Changer de médecin ?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingMedecinId(null)}>
              Rester
            </Button>
            <Button variant="danger" onClick={confirmMedecinSwitch}>
              Changer sans enregistrer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Les modifications non enregistrées pour ce médecin seront perdues. Voulez-vous continuer ?
        </p>
      </Modal>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 animate-fade-up">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Saisir des desiderata
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <Badge tone="primary">
              <CalendarRange size={13} />
              {new Date(periodeSaisie.startDate).toLocaleDateString('fr-FR')} –{' '}
              {new Date(periodeSaisie.endDate).toLocaleDateString('fr-FR')}
            </Badge>
            {selectedMedecin && (
              <>
                <span>·</span>
                <span>
                  Dr {selectedMedecin.prenom} {selectedMedecin.nom} · {dates.length} jours ·{' '}
                  {filledCount} choix renseignés
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sélection du médecin */}
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
            <Users size={15} className="text-primary-500" aria-hidden="true" />
            Sélectionner un médecin
          </h2>
          <Select
            value={selectedMedecinId}
            onChange={handleMedecinSelectChange}
            aria-label="Sélectionner un médecin"
            className="sm:max-w-md"
          >
            <option value="">— Choisir un médecin —</option>
            {medecins.map((medecin) => (
              <option key={medecin.id} value={medecin.id}>
                Dr {medecin.prenom} {medecin.nom}
              </option>
            ))}
          </Select>
          {selectedMedecin && (
            <div className="mt-4 space-y-2">
              <Alert kind={existingDesiderataId ? 'success' : 'info'}>
                {existingDesiderataId
                  ? 'Ce médecin a déjà saisi des desiderata. Vous pouvez les modifier.'
                  : 'Aucun desiderata existant pour ce médecin.'}
              </Alert>
              <p className="text-xs text-ink-500">
                Vous pouvez importer un fichier JSON contenant les desiderata du médecin via le bouton « Importer JSON » en haut de page.
              </p>
            </div>
          )}
        </Card>

        {/* Formulaire (affiché seulement si un médecin est sélectionné) */}
        {selectedMedecinId && periodeSaisie ? (
          <>
            <DesiderataPreferences preferences={preferences} onChange={setPreference} />

            <div className="mb-6 grid gap-4">
              <QuickFill creneaux={creneaux} onApply={handleQuickFill} periodeSaisie={periodeSaisie} />
              <WeeklyPattern creneaux={creneaux} onApplyPattern={handleApplyPattern} periodeSaisie={periodeSaisie} />
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
                disabled={!selectedMedecinId}
                loading={isSaving}
                icon={<Save size={18} />}
              >
                Enregistrer les desiderata
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
                <Calendar size={28} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink-800">Aucun médecin sélectionné</h3>
                <p className="mx-auto max-w-sm text-sm text-ink-500">
                  Veuillez sélectionner un médecin pour remplir ses desiderata.
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default FormulaireDesiderataAdmin;
