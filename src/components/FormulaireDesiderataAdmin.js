// src/components/FormulaireDesiderataAdmin.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';
import { getMedecins } from '../services/userService';
import {
  addDesiderata,
  getPeriodeSaisie,
  getDesiderataByUser,
  updateDesiderata
} from '../services/planningService';
import { estJourFerie } from '../utils/joursFeries';
import logger from '../utils/logger';
import {
  Calendar,
  Save,
  Upload,
  ChevronDown,
  CalendarRange,
  Sparkles,
  Users
} from 'lucide-react';
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
  Checkbox,
  Select,
  FormField,
  useToast
} from './ui';
import { useAuth } from '../contexts/AuthContext';
import useUnsavedChangesWarning from '../hooks/useUnsavedChangesWarning';
import useBlockNavigation from '../hooks/useBlockNavigation';
import { CRENEAUX as creneaux, CHOIX_DISPONIBILITE } from '../constants/creneaux';

const options = CHOIX_DISPONIBILITE;

// Habillage coloré du sélecteur de choix selon la valeur
const choiceStyles = {
  Oui: 'border-success-300 bg-success-50 text-success-700 focus:ring-success-500/30',
  Possible: 'border-warning-300 bg-warning-50 text-warning-700 focus:ring-warning-500/30',
  Non: 'border-danger-300 bg-danger-50 text-danger-700 focus:ring-danger-500/30',
  '': 'border-ink-200 bg-white text-ink-500 focus:ring-primary-500/25'
};

function FormulaireDesiderataAdmin() {
  // États
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [desiderata, setDesiderata] = useState({});
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState(0);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecinId, setSelectedMedecinId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  // Médecin vers lequel basculer, en attente de confirmation d'abandon.
  const [pendingMedecinId, setPendingMedecinId] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  // Avertit avant fermeture/rechargement de l'onglet si saisie non enregistrée.
  useUnsavedChangesWarning(isDirty);
  // Bloque la navigation interne (liens, retour) tant que la saisie n'est pas enregistrée.
  useBlockNavigation(
    isDirty,
    'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?'
  );

  // Génération des dates avec correction de fuseau horaire
  const generateDates = useCallback(() => {
    if (!periodeSaisie) {
      return [];
    }
    const dates = [];
    const currentDate = new Date(periodeSaisie.startDate);

    // Définir l'heure à midi pour éviter les problèmes de changement de jour
    currentDate.setHours(12, 0, 0, 0);

    const end = new Date(periodeSaisie.endDate);
    end.setHours(12, 0, 0, 0);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  // Effet pour charger les données initiales
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        // Charger la liste des médecins
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
      } catch (error) {
        if (cancelled) { return; }
        logger.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données: ' + error.message);
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Effet pour charger les desiderata existants du médecin sélectionné
  useEffect(() => {
    const loadMedecinDesiderata = async () => {
      if (!selectedMedecinId || !periodeSaisie) {
        // Réinitialiser si aucun médecin n'est sélectionné
        setDesiderata({});
        setNombreGardesSouhaitees(0);
        setNombreGardesMaxParSemaine(3);
        setGardesGroupees(false);
        setRenfortsAssocies(false);
        setExistingDesiderataId(null);
        setIsDirty(false);
        return;
      }

      try {
        const userDesiderata = await getDesiderataByUser(selectedMedecinId);
        const relevantDesiderata = userDesiderata.find(d =>
          new Date(d.startDate) <= new Date(periodeSaisie.endDate) &&
          new Date(d.endDate) >= new Date(periodeSaisie.startDate)
        );

        if (relevantDesiderata) {
          setExistingDesiderataId(relevantDesiderata.id);
          setDesiderata(relevantDesiderata.desiderata || {});
          setNombreGardesSouhaitees(relevantDesiderata.nombreGardesSouhaitees || 0);
          setNombreGardesMaxParSemaine(relevantDesiderata.nombreGardesMaxParSemaine || 3);
          setGardesGroupees(relevantDesiderata.gardesGroupees || false);
          setRenfortsAssocies(relevantDesiderata.renfortsAssocies || false);
        } else {
          // Réinitialiser si pas de desiderata existants
          setDesiderata({});
          setNombreGardesSouhaitees(0);
          setNombreGardesMaxParSemaine(3);
          setGardesGroupees(false);
          setRenfortsAssocies(false);
          setExistingDesiderataId(null);
        }
        // Données fraîchement chargées depuis le serveur : rien à sauvegarder.
        setIsDirty(false);
      } catch (error) {
        logger.error('Erreur lors du chargement des desiderata du médecin:', error);
      }
    };

    loadMedecinDesiderata();
  }, [selectedMedecinId, periodeSaisie]);

  // Gestion des changements de desiderata
  const handleDesiderataChange = (date, creneau, value) => {
    setIsDirty(true);
    setDesiderata(prev => {
      const newDesiderata = { ...prev };

      if (!newDesiderata[date]) {
        newDesiderata[date] = {};
      }

      newDesiderata[date][creneau] = value;

      return newDesiderata;
    });
  };

  // Gestion du remplissage rapide
  const handleQuickFill = ({ creneaux: selectedCreneaux, jours: selectedJours, disponibilite, startDate, endDate }) => {
    setIsDirty(true);
    const start = new Date(startDate);
    start.setHours(12, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(12, 0, 0, 0);

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const dates = generateDates().filter(date => {
        date.setHours(12, 0, 0, 0);
        return date >= start && date <= end;
      });

      dates.forEach(date => {
        const dayOfWeek = date.getDay().toString();

        if (selectedJours.includes(dayOfWeek)) {
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
    setIsDirty(true);
    const start = new Date(startDate);
    const end = new Date(endDate);

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const currentDate = new Date(start);

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

  // Application des données importées (directement ou après confirmation)
  const applyImportedData = (importedData) => {
    setIsDirty(true);
    setDesiderata(importedData.desiderata || {});
    setNombreGardesSouhaitees(importedData.nombreGardesSouhaitees || 0);
    setNombreGardesMaxParSemaine(importedData.nombreGardesMaxParSemaine || 3);
    setGardesGroupees(importedData.gardesGroupees || false);
    setRenfortsAssocies(importedData.renfortsAssocies || false);

    toast.success(`Desiderata importés avec succès ! ${Object.keys(importedData.desiderata).length} jours chargés.`);
  };

  // Gestion de l'import de fichier JSON
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Vérifier qu'un médecin est sélectionné
    if (!selectedMedecinId) {
      toast.warning('Veuillez d\'abord sélectionner un médecin');
      event.target.value = '';
      return;
    }

    // Vérifier l'extension du fichier
    if (!file.name.endsWith('.json')) {
      toast.error('Le fichier doit être au format JSON');
      event.target.value = '';
      return;
    }

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);

      // Valider la structure du JSON
      if (!importedData.desiderata || typeof importedData.desiderata !== 'object') {
        toast.error('Structure JSON invalide: le champ "desiderata" est manquant');
        event.target.value = '';
        return;
      }

      // Réinitialiser l'input file (le contenu est déjà lu)
      event.target.value = '';

      // Si des desiderata existent déjà, demander confirmation avant de remplacer
      if (existingDesiderataId) {
        setPendingImport(importedData);
        return;
      }

      // Importer les données
      applyImportedData(importedData);

    } catch (error) {
      logger.error('Erreur lors de l\'import du fichier:', error);
      toast.error('Erreur lors de la lecture du fichier JSON: ' + error.message);
      event.target.value = '';
    }
  };

  // Confirmation / annulation du remplacement des desiderata importés
  const handleConfirmImport = () => {
    if (pendingImport) {
      applyImportedData(pendingImport);
    }
    setPendingImport(null);
  };

  const handleCancelImport = () => {
    // Comme avant : on garde les desiderata existants, rien n'est importé
    setPendingImport(null);
  };

  // Changement de médecin : si des modifications ne sont pas enregistrées,
  // demander confirmation avant de basculer (le changement écrase la saisie).
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

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

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
          toast.success('Desiderata mis à jour avec succès !');
        } else {
          await addDesiderata(selectedMedecinId, desiderataData);
          toast.success('Desiderata soumis avec succès !');
        }
        // Plus de modifications en attente → ne pas bloquer la navigation.
        setIsDirty(false);
        // Laisser le temps de voir le message avant de revenir au tableau de bord
        setTimeout(() => navigate('/dashboard-admin'), 1500);
      } catch (error) {
        logger.error('Erreur lors de la soumission des desiderata:', error);
        setIsSaving(false);
        toast.error('Une erreur est survenue lors de la soumission des desiderata: ' + error.message);
      }
    }
  };

  // Fonctions utilitaires
  const isWeekendOrHoliday = (date) => {
    const day = date.getDay();
    const formattedDate = date.toISOString().split('T')[0];
    return day === 0 || day === 6 || estJourFerie(formattedDate);
  };

  const formatDate = (date) => {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return {
      day: days[date.getDay()],
      num: date.getDate().toString().padStart(2, '0'),
      month: months[date.getMonth()]
    };
  };

  const selectedMedecin = medecins.find(m => m.id === selectedMedecinId);

  // États de chargement et d'erreur
  if (loading) {
    return <LoadingScreen message="Chargement des desiderata…" />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  const dates = generateDates();
  const filledCount = Object.values(desiderata).reduce(
    (acc, day) => acc + Object.values(day || {}).filter(Boolean).length,
    0
  );

  const stickyLeft = 'sticky left-0 z-10';

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Menu fixe en haut */}
      <AppHeader
        backTo="/dashboard-admin"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              title="Importer les desiderata depuis un fichier JSON"
            >
              <span className="hidden sm:inline">Importer JSON</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
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

      {/* Modale de confirmation du remplacement des desiderata importés */}
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

      {/* Modale de confirmation avant de changer de médecin (saisie non enregistrée) */}
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

      {/* Contenu principal */}
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 animate-fade-up">
        {/* En-tête de page */}
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
                  Dr {selectedMedecin.prenom} {selectedMedecin.nom} · {dates.length} jours · {filledCount} choix renseignés
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sélection du médecin */}
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
            <Users size={15} className="text-primary-500" />
            Sélectionner un médecin
          </h2>
          <Select
            value={selectedMedecinId}
            onChange={handleMedecinSelectChange}
            aria-label="Sélectionner un médecin"
            className="sm:max-w-md"
          >
            <option value="">— Choisir un médecin —</option>
            {medecins.map(medecin => (
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
        {selectedMedecinId && periodeSaisie && (
          <>
            {/* Préférences générales */}
            <Card className="mb-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">
                Préférences générales
              </h2>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <FormField
                  label="Nombre de gardes souhaitées par mois"
                  type="number"
                  min="0"
                  className="mb-0"
                  value={nombreGardesSouhaitees}
                  onChange={(e) => { setIsDirty(true); setNombreGardesSouhaitees(parseInt(e.target.value, 10) || 0); }}
                />
                <FormField
                  label="Maximum de gardes par semaine"
                  type="number"
                  min="1"
                  max="7"
                  className="mb-0"
                  value={nombreGardesMaxParSemaine}
                  onChange={(e) => { setIsDirty(true); setNombreGardesMaxParSemaine(parseInt(e.target.value, 10) || 1); }}
                />
                <Checkbox
                  checked={gardesGroupees}
                  onChange={(v) => { setIsDirty(true); setGardesGroupees(v); }}
                  label="Gardes groupées dans un même week-end"
                />
                <Checkbox
                  checked={renfortsAssocies}
                  onChange={(v) => { setIsDirty(true); setRenfortsAssocies(v); }}
                  label="Renforts associés à une garde"
                />
              </div>
            </Card>

            {/* Outils de remplissage */}
            <div className="mb-6 grid gap-4">
              <QuickFill
                creneaux={creneaux}
                onApply={handleQuickFill}
                periodeSaisie={periodeSaisie}
              />
              <WeeklyPattern
                creneaux={creneaux}
                onApplyPattern={handleApplyPattern}
                periodeSaisie={periodeSaisie}
              />
            </div>

            {/* Tableau des desiderata */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
                  <Sparkles size={15} className="text-primary-500" />
                  Disponibilités par créneau
                </h2>
                {/* Légende */}
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-success-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-success-400" /> Oui
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-warning-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-warning-400" /> Possible
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-danger-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger-400" /> Non
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className={twMerge(
                        'bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500',
                        'sticky left-0 top-0 z-30 border-b border-ink-200'
                      )}>
                        Date
                      </th>
                      {creneaux.map(creneau => (
                        <th key={creneau.id} className="sticky top-0 z-20 min-w-[150px] border-b border-l border-ink-100 bg-ink-50 px-4 py-3 text-left">
                          <div className="font-bold text-ink-800">{creneau.label}</div>
                          <div className="text-xs font-medium text-ink-500">{creneau.hours}</div>
                          <div className="text-[11px] text-ink-500">
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
                      const rowBg = isHighlighted ? 'bg-primary-50/40' : 'bg-white';
                      const d = formatDate(date);
                      return (
                        <tr key={dateString} className={twMerge('group', rowBg)}>
                          <td className={twMerge(
                            'border-b border-ink-100 px-4 py-2.5 font-semibold',
                            stickyLeft, rowBg
                          )}>
                            <span className="flex items-baseline gap-1.5">
                              <span className={twMerge(
                                'text-xs font-bold uppercase',
                                isHighlighted ? 'text-primary-600' : 'text-ink-500'
                              )}>
                                {d.day}
                              </span>
                              <span className="text-ink-900">{d.num}</span>
                              <span className="text-xs text-ink-500">{d.month}</span>
                            </span>
                          </td>
                          {creneaux.map(creneau => {
                            const value = desiderata[dateString]?.[creneau.id] || '';
                            const disabled = creneau.samediOnly && date.getDay() !== 6;
                            return (
                              <td key={`${dateString}-${creneau.id}`} className="border-b border-l border-ink-100 px-3 py-2">
                                {!disabled ? (
                                  <div className="relative">
                                    <select
                                      value={value}
                                      aria-label={`Disponibilité ${d.day} ${d.num} ${d.month} — ${creneau.label} ${creneau.hours}`}
                                      onChange={(e) => handleDesiderataChange(dateString, creneau.id, e.target.value)}
                                      className={twMerge(
                                        'w-full appearance-none rounded-lg border py-1.5 pl-2.5 pr-7 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2',
                                        choiceStyles[value] || choiceStyles['']
                                      )}
                                    >
                                      <option value="">—</option>
                                      {options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      size={14}
                                      aria-hidden="true"
                                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60"
                                    />
                                  </div>
                                ) : (
                                  <span className="block text-center text-xs text-ink-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Barre d'action bas de page */}
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
        )}

        {!selectedMedecinId && (
          <Card>
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
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
