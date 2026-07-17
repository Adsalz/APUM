// src/components/FormulaireDesirata.js
import React, { useState, useEffect, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';
import {
  addDesiderata,
  getPeriodeSaisie,
  getDesiderataByUser,
  updateDesiderata
} from '../services/planningService';
import { exportMedecinDesiderataToExcel } from '../services/excelExportService';
import { estJourFerie } from '../utils/joursFeries';
import logger from '../utils/logger';
import { Save, Download, CalendarRange, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Card,
  Button,
  FormField,
  Checkbox,
  Badge,
  useToast
} from './ui';
import QuickFill from './QuickFill';
import WeeklyPattern from './WeeklyPattern';

const creneaux = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3 }
];

const options = ['Oui', 'Possible', 'Non'];

// Habillage coloré du sélecteur de choix selon la valeur
const choiceStyles = {
  Oui: 'border-success-300 bg-success-50 text-success-700 focus:ring-success-500/30',
  Possible: 'border-warning-300 bg-warning-50 text-warning-700 focus:ring-warning-500/30',
  Non: 'border-danger-300 bg-danger-50 text-danger-700 focus:ring-danger-500/30',
  '': 'border-ink-200 bg-white text-ink-400 focus:ring-primary-500/25'
};

function FormulaireDesirata() {
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [desiderata, setDesiderata] = useState({});
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState(0);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { profile } = useAuth();
  const user = profile;
  const toast = useToast();

  const generateDates = useCallback(() => {
    if (!periodeSaisie) {return [];}
    const dates = [];
    const currentDate = new Date(periodeSaisie.startDate);
    currentDate.setHours(12, 0, 0, 0);
    const end = new Date(periodeSaisie.endDate);
    end.setHours(12, 0, 0, 0);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  useEffect(() => {
    if (!profile) {return;}

    const fetchData = async () => {
      try {
        const periode = await getPeriodeSaisie();
        if (periode) {
          setPeriodeSaisie(periode);
          const userDesiderata = await getDesiderataByUser(profile.id);
          const relevantDesiderata = userDesiderata.find(d =>
            new Date(d.startDate) <= new Date(periode.endDate) &&
            new Date(d.endDate) >= new Date(periode.startDate)
          );

          if (relevantDesiderata) {
            setExistingDesiderataId(relevantDesiderata.id);
            setDesiderata(relevantDesiderata.desiderata || {});
            setNombreGardesSouhaitees(relevantDesiderata.nombreGardesSouhaitees || 0);
            setNombreGardesMaxParSemaine(relevantDesiderata.nombreGardesMaxParSemaine || 3);
            setGardesGroupees(relevantDesiderata.gardesGroupees || false);
            setRenfortsAssocies(relevantDesiderata.renfortsAssocies || false);
          }
        } else {
          setError('Aucune période de saisie n\'a été définie par l\'administrateur.');
        }
      } catch (err) {
        logger.error('Erreur lors de la récupération des données:', err);
        setError('Erreur lors de la récupération des données: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleDesiderataChange = (date, creneau, value) => {
    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      if (!newDesiderata[date]) {
        newDesiderata[date] = {};
      }
      newDesiderata[date][creneau] = value;
      return newDesiderata;
    });
  };

  const handleQuickFill = ({ creneaux: selectedCreneaux, jours: selectedJours, disponibilite, startDate, endDate }) => {
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
    toast.info('Remplissage rapide appliqué.');
  };

  const handleApplyPattern = (pattern, startDate, endDate) => {
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
    toast.info('Modèle hebdomadaire appliqué.');
  };

  const handleSubmit = async (e) => {
    if (e) {e.preventDefault();}
    if (user && !isSaving) {
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
          const newId = await addDesiderata(user.id, desiderataData);
          if (newId) {
            setExistingDesiderataId(newId);
          }
          toast.success('Desiderata enregistrés avec succès !');
        }
      } catch (err) {
        logger.error('Erreur lors de la soumission des desiderata:', err);
        toast.error('Erreur lors de l\'enregistrement : ' + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleExportExcel = async () => {
    if (!user || !periodeSaisie) {return;}
    setIsExporting(true);
    try {
      const currentDesiderata = {
        userId: user.id,
        startDate: periodeSaisie.startDate,
        endDate: periodeSaisie.endDate,
        desiderata,
        nombreGardesSouhaitees,
        nombreGardesMaxParSemaine,
        gardesGroupees,
        renfortsAssocies
      };
      const result = await exportMedecinDesiderataToExcel(user, currentDesiderata, periodeSaisie);
      toast.success(result.message || 'Export Excel réussi.');
    } catch (err) {
      logger.error('Erreur lors de l\'export Excel:', err);
      toast.error('Erreur lors de l\'export Excel.');
    } finally {
      setIsExporting(false);
    }
  };

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

  if (loading) {
    return <LoadingScreen message="Chargement de vos desiderata…" />;
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
      <AppHeader
        backTo="/dashboard-medecin"
        actions={
          <>
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
        {/* En-tête de page */}
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
            <span>{dates.length} jours · {filledCount} choix renseignés</span>
          </div>
        </div>

        {/* Préférences générales */}
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">
            Préférences générales
          </h2>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField
              label="Gardes souhaitées par mois"
              type="number"
              min="0"
              className="mb-0"
              value={nombreGardesSouhaitees}
              onChange={(e) => setNombreGardesSouhaitees(parseInt(e.target.value, 10) || 0)}
            />
            <FormField
              label="Maximum de gardes par semaine"
              type="number"
              min="1"
              max="7"
              className="mb-0"
              value={nombreGardesMaxParSemaine}
              onChange={(e) => setNombreGardesMaxParSemaine(parseInt(e.target.value, 10) || 1)}
            />
            <Checkbox
              checked={gardesGroupees}
              onChange={setGardesGroupees}
              label="Gardes groupées dans un même week-end"
            />
            <Checkbox
              checked={renfortsAssocies}
              onChange={setRenfortsAssocies}
              label="Renforts associés à une garde"
            />
          </div>
        </Card>

        {/* Outils de remplissage */}
        <div className="mb-6 grid gap-4">
          <QuickFill creneaux={creneaux} onApply={handleQuickFill} periodeSaisie={periodeSaisie} />
          <WeeklyPattern creneaux={creneaux} onApplyPattern={handleApplyPattern} periodeSaisie={periodeSaisie} />
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
                      <div className="text-xs font-medium text-ink-400">{creneau.hours}</div>
                      <div className="text-[11px] text-ink-400">
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
                            isHighlighted ? 'text-primary-600' : 'text-ink-400'
                          )}>
                            {d.day}
                          </span>
                          <span className="text-ink-900">{d.num}</span>
                          <span className="text-xs text-ink-400">{d.month}</span>
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
