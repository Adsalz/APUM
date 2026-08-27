// src/components/PlanningVisualisation.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { getMedecins } from '../services/userService';
import { getPublishedPlanning, getPeriodeSaisie } from '../services/planningService';
import { ROUTE_DESIDERATA, saisieOuverte } from '../utils/accueilMedecin';
import { Download, SlidersHorizontal, Eye, User, CalendarX, ClipboardList } from 'lucide-react';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Card,
  Button,
  Badge,
  SegmentedControl,
  EmptyState,
  useToast
} from './ui';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';
import { estJourFerie } from '../utils/joursFeries';
import { libelleMoisAnnee } from '../utils/mois';
// Créneaux (avec teinte `chip`) : source unique partagée avec les formulaires.
import { CRENEAUX as creneaux } from '../constants/creneaux';

function PlanningVisualisation() {
  const [planning, setPlanning] = useState(null);
  // Période du trimestre à planifier : sert au raccourci vers la saisie (les
  // bornes `startDate`/`endDate` ci-dessous, elles, bougent avec les filtres).
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'personal'
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { profile, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const allMedecins = await getMedecins();
        if (cancelled) { return; }
        setMedecins(allMedecins);

        const periode = await getPeriodeSaisie();
        if (cancelled) { return; }
        if (!periode) {
          setError('Aucune période de saisie n\'a été définie');
          return;
        }
        setPeriodeSaisie(periode);
        setStartDate(periode.startDate.split('T')[0]);
        setEndDate(periode.endDate.split('T')[0]);

        const publishedPlan = await getPublishedPlanning();
        if (cancelled) { return; }
        if (publishedPlan) {
          setPlanning(publishedPlan);
        } else {
          setError('Aucun planning n\'a été publié');
        }
      } catch (err) {
        if (cancelled) { return; }
        logger.error('Erreur:', err);
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const exportToICS = async () => {
    if (!planning || !planning.planning) {return;}
    const events = [];
    const sortedDates = Object.keys(planning.planning).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
      creneaux.forEach(creneau => {
        if (planning.planning[date][creneau.id]) {
          planning.planning[date][creneau.id].forEach((medecinId) => {
            if (medecinId === profile.id) {
              const evStart = new Date(date);
              const evEnd = new Date(date);
              let startHour, endHour;
              switch (creneau.id) {
              case 'QUART_1': startHour = 1; endHour = 7; break;
              case 'QUART_2': startHour = 7; endHour = 13; break;
              case 'RENFORT_1': startHour = 10; endHour = 13; break;
              case 'QUART_3': startHour = 13; endHour = 19; break;
              case 'RENFORT_2': startHour = 20; endHour = 24; break;
              case 'QUART_4': startHour = 19; endHour = 25; break;
              default: startHour = 0; endHour = 0; break;
              }
              evStart.setHours(startHour, 0, 0);
              evEnd.setHours(endHour, 0, 0);
              if (endHour === 25) {
                evEnd.setDate(evEnd.getDate() + 1);
                evEnd.setHours(1, 0, 0);
              }
              events.push({
                start: [evStart.getFullYear(), evStart.getMonth() + 1, evStart.getDate(), evStart.getHours(), evStart.getMinutes()],
                end: [evEnd.getFullYear(), evEnd.getMonth() + 1, evEnd.getDate(), evEnd.getHours(), evEnd.getMinutes()],
                title: `Garde - ${creneau.label}`,
                description: `Garde médicale - ${creneau.label}`,
                location: 'Hôpital'
              });
            }
          });
        }
      });
    });

    if (events.length === 0) {
      toast.info('Aucune garde à exporter sur cette période.');
      return;
    }

    // ics chargé à la demande pour alléger le bundle initial.
    const { createEvents } = await import('ics');
    createEvents(events, (icsErr, value) => {
      if (icsErr) {
        logger.error(icsErr);
        toast.error('Erreur lors de la création du fichier ICS.');
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'gardes-apum.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${events.length} garde(s) exportée(s).`);
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return { day: days[date.getDay()], num: date.getDate().toString().padStart(2, '0'), month: months[date.getMonth()] };
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getMedecinName = (medecinId) => {
    if (medecinId === profile.id) {return `Dr ${profile.prenom} ${profile.nom}`;}
    const medecin = medecins.find(m => m.id === medecinId);
    return medecin ? `Dr ${medecin.prenom} ${medecin.nom}` : 'Médecin inconnu';
  };

  if (loading) {return <LoadingScreen message="Chargement du planning…" />;}
  if (error) {return <ErrorScreen message={error} />;}

  // Liste des ids affichés dans une cellule selon le mode de vue
  const cellIds = (date, creneauId) => {
    const ids = planning?.planning?.[date]?.[creneauId] || [];
    return viewMode === 'personal' ? ids.filter(id => id === profile.id) : ids;
  };

  const allDates = Object.keys(planning.planning)
    .filter(date => date >= startDate && date <= endDate)
    .sort((a, b) => new Date(a) - new Date(b));

  // En mode « Mes gardes », on ne garde que les jours où l'utilisateur est de garde
  const filteredDates =
    viewMode === 'personal'
      ? allDates.filter(date => creneaux.some(c => cellIds(date, c.id).length > 0))
      : allDates;

  // Bandeaux de séparation entre les mois, uniquement si la période en couvre
  // plusieurs (demande admin : « ligne de séparation entre les mois »).
  const multiMois = new Set(filteredDates.map(date => date.slice(0, 7))).size > 1;

  // Le planning affiché est celui du trimestre en cours, mais la saisie du
  // suivant est déjà ouverte : sans tableau de bord médecin, ce raccourci est
  // le seul chemin vers le formulaire.
  const saisieEnCours = role !== 'admin' && saisieOuverte(periodeSaisie, planning);

  return (
    <div className="min-h-screen bg-ink-100">
      <AppHeader
        backTo={role === 'admin' ? '/dashboard-admin' : undefined}
        actions={
          <>
            {saisieEnCours && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ClipboardList size={16} />}
                onClick={() => navigate(ROUTE_DESIDERATA)}
                title="Saisir mes desiderata pour le trimestre à venir"
              >
                <span className="hidden sm:inline">Mes desiderata</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportToICS}>
              <span className="hidden sm:inline">Exporter</span> ICS
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* En-tête + contrôles */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Planning des gardes
            </h1>
            {planning.publishedAt && (
              <p className="mt-1 text-sm text-ink-500">
                Publié le {new Date(planning.publishedAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'all', label: 'Voir tout', icon: <Eye size={15} /> },
                { value: 'personal', label: 'Mes gardes', icon: <User size={15} /> }
              ]}
            />
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="md"
              icon={<SlidersHorizontal size={16} />}
              onClick={() => setShowFilters(v => !v)}
            >
              <span className="hidden sm:inline">Période</span>
            </Button>
          </div>
        </div>

        {/* Filtres de période */}
        {showFilters && (
          <Card className="mb-5 p-4 animate-scale-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="planning-view-start" className="mb-1 block text-xs font-medium text-ink-500">Du</label>
                <input
                  id="planning-view-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="planning-view-end" className="mb-1 block text-xs font-medium text-ink-500">Au</label>
                <input
                  id="planning-view-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Tableau du planning */}
        <Card className="overflow-hidden p-0">
          {filteredDates.length === 0 ? (
            <EmptyState
              icon={<CalendarX size={26} />}
              title={viewMode === 'personal' ? 'Aucune garde pour vous' : 'Aucune date sur cette période'}
              description={
                viewMode === 'personal'
                  ? 'Vous n\'avez aucune garde programmée sur la période sélectionnée.'
                  : 'Ajustez la période pour afficher le planning.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 border-b border-ink-200 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                      Date
                    </th>
                    {creneaux.map(creneau => (
                      <th key={creneau.id} className="sticky top-0 z-20 min-w-[150px] border-b border-l border-ink-100 bg-ink-50 px-4 py-3 text-left">
                        <div className="font-bold text-ink-800">{creneau.label}</div>
                        <div className="text-xs font-medium text-ink-500">{creneau.hours}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDates.map((date, index) => {
                    const we = isWeekend(date);
                    const rowBg = we ? 'bg-primary-50/40' : 'bg-white';
                    const d = formatDate(date);
                    const nouveauMois = multiMois &&
                      (index === 0 || date.slice(0, 7) !== filteredDates[index - 1].slice(0, 7));
                    return (
                      <React.Fragment key={date}>
                      {nouveauMois && (
                        <tr>
                          <td
                            colSpan={creneaux.length + 1}
                            className="border-y-2 border-ink-200 bg-ink-100 px-4 py-1.5"
                          >
                            <span className="sticky left-0 inline-block text-xs font-extrabold uppercase tracking-wider text-ink-600">
                              {libelleMoisAnnee(date)}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className={rowBg}>
                        <td className={twMerge('sticky left-0 z-10 border-b border-ink-100 px-4 py-2.5 font-semibold', rowBg)}>
                          <span className="flex items-baseline gap-1.5">
                            <span className={twMerge('text-xs font-bold uppercase', we ? 'text-primary-600' : 'text-ink-500')}>{d.day}</span>
                            <span className="text-ink-900">{d.num}</span>
                            <span className="text-xs text-ink-500">{d.month}</span>
                          </span>
                        </td>
                        {creneaux.map(creneau => {
                          const ids = cellIds(date, creneau.id);
                          // Renfort 10h/13h : samedi uniquement, jamais un férié
                          // (samedi férié = effectifs d'un dimanche).
                          const disabled = creneau.samediOnly && (new Date(date).getDay() !== 6 || estJourFerie(date));
                          return (
                            <td key={`${date}-${creneau.id}`} className="border-b border-l border-ink-100 px-3 py-2 align-top">
                              {!disabled && ids.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {ids.map((medecinId, index) => {
                                    const mine = medecinId === profile.id;
                                    return (
                                      <span
                                        key={index}
                                        className={twMerge(
                                          'truncate rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset',
                                          medecinId ? creneau.chip : 'bg-ink-50 text-ink-500 ring-ink-200',
                                          mine && 'outline outline-2 outline-primary-400'
                                        )}
                                        title={medecinId ? getMedecinName(medecinId) : 'Non assigné'}
                                      >
                                        {medecinId ? getMedecinName(medecinId) : 'Non assigné'}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="block text-center text-xs text-ink-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {viewMode === 'all' && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone="primary" dot>Vos gardes sont entourées en bleu</Badge>
          </div>
        )}
      </main>
    </div>
  );
}

export default PlanningVisualisation;
