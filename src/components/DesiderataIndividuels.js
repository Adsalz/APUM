// src/components/DesiderataIndividuels.js
// Fiche desiderata d'UN médecin, affichée au format du fichier Excel de
// référence (« DESIDERATA ASO26 ») : pensée pour être ouverte dans un onglet
// À CÔTÉ de l'écran d'édition du planning. Une coche verte marque les gardes
// déjà attribuées au médecin dans le planning en cours (dernier enregistré).
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCcw, Check, UserSearch } from 'lucide-react';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Card,
  Button,
  Select,
  EmptyState
} from './ui';
import { getMedecins } from '../services/userService';
import { getPeriodeSaisie, getLatestPlanning, getDesiderataForPeriod } from '../services/planningService';
import { generateDatesList } from '../services/excelExportService';
import { estJourFerie } from '../utils/joursFeries';
import { trierMedecinsParNom } from '../utils/medecins';
import { libelleMoisAnnee } from '../utils/mois';
import logger from '../utils/logger';

// Ordre et libellés des colonnes de la fiche de référence.
const FICHE_COLONNES = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h' },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h' },
  { id: 'RENFORT_1', label: 'RENFORT SAMEDI', hours: '10h - 13h' },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h' },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h' },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h' },
];

// Couleurs exactes de la fiche Excel (réponses, en-têtes, fonds).
const COULEUR_PREF = {
  Oui: 'text-[#00B050]',
  Possible: 'text-[#FFC000]',
  Non: 'text-[#FF0000]',
};

const ouiNon = (v) => (v === true ? 'OUI' : v === false ? 'NON' : '—');

function DesiderataIndividuels() {
  const [medecins, setMedecins] = useState([]);
  const [periode, setPeriode] = useState(null);
  const [desiderataDocs, setDesiderataDocs] = useState([]);
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Le médecin sélectionné vit dans l'URL (?medecin=…) : le lien depuis
  // l'écran d'édition pré-sélectionne, et un rechargement conserve le choix.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('medecin') || '';
  const changerMedecin = (id) => setSearchParams(id ? { medecin: id } : {}, { replace: true });

  const chargerDonneesVivantes = useCallback(async (periodeCourante) => {
    const [plan, desiderataData] = await Promise.all([
      getLatestPlanning(),
      periodeCourante
        ? getDesiderataForPeriod(periodeCourante.startDate, periodeCourante.endDate)
        : Promise.resolve([]),
    ]);
    setPlanning(plan);
    setDesiderataDocs(desiderataData || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [medecinsList, periodeSaisie] = await Promise.all([
          getMedecins(),
          getPeriodeSaisie(),
        ]);
        if (cancelled) { return; }
        setMedecins(trierMedecinsParNom(medecinsList));
        setPeriode(periodeSaisie);
        await chargerDonneesVivantes(periodeSaisie);
      } catch (err) {
        if (cancelled) { return; }
        logger.error('Erreur:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [chargerDonneesVivantes]);

  // « Actualiser » : recharge le planning (modifié dans l'autre onglet) et les
  // fiches, sans recharger la page.
  const actualiser = async () => {
    setRefreshing(true);
    try {
      await chargerDonneesVivantes(periode);
    } catch (err) {
      logger.error('Erreur lors de l\'actualisation:', err);
      setError('Erreur lors de l\'actualisation');
    } finally {
      setRefreshing(false);
    }
  };

  const dates = useMemo(() => (periode ? generateDatesList(periode) : []), [periode]);
  const ficheMedecin = desiderataDocs.find((d) => d.userId === selectedId);
  const planningJours = useMemo(() => planning?.planning || {}, [planning]);

  // Gardes attribuées au médecin sélectionné, comptées par mois.
  const gardesParMois = useMemo(() => {
    const compte = {};
    if (!selectedId) { return compte; }
    Object.entries(planningJours).forEach(([dateKey, creneauxJour]) => {
      Object.values(creneauxJour).forEach((ids) => {
        (ids || []).forEach((id) => {
          if (id === selectedId) {
            const mois = dateKey.slice(0, 7);
            compte[mois] = (compte[mois] || 0) + 1;
          }
        });
      });
    });
    return compte;
  }, [planningJours, selectedId]);

  const moisPeriode = useMemo(
    () => [...new Set(dates.map((d) => d.toISOString().slice(0, 7)))],
    [dates]
  );

  if (loading) { return <LoadingScreen message="Chargement des desiderata…" />; }
  if (error) { return <ErrorScreen message={error} />; }

  const souhaitMensuel = ficheMedecin?.nombreGardesSouhaitees ?? null;

  return (
    <div className="min-h-screen bg-ink-100">
      <AppHeader
        backTo="/dashboard-admin"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCcw size={16} aria-hidden="true" />}
            loading={refreshing}
            onClick={actualiser}
          >
            Actualiser
          </Button>
        }
      />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Desiderata individuels
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              La fiche du médecin au format du fichier Excel — à ouvrir à côté de
              l'écran d'édition du planning. ✓ = garde attribuée dans le planning en cours.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <Select value={selectedId} onChange={(e) => changerMedecin(e.target.value)}>
              <option value="">— Choisir un médecin —</option>
              {medecins.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr {m.prenom} {m.nom}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!periode && (
          <Card className="p-0">
            <EmptyState
              icon={<UserSearch size={26} />}
              title="Aucune période de saisie"
              description="Définissez d'abord une période de saisie des desiderata."
            />
          </Card>
        )}

        {periode && !selectedId && (
          <Card className="p-0">
            <EmptyState
              icon={<UserSearch size={26} />}
              title="Choisissez un médecin"
              description="Sélectionnez un médecin pour afficher sa fiche de desiderata."
            />
          </Card>
        )}

        {periode && selectedId && (
          <>
            {/* Gardes attribuées par mois vs souhait mensuel */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {moisPeriode.map((mois) => (
                <span
                  key={mois}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200"
                >
                  {libelleMoisAnnee(mois)} :
                  <span className="font-extrabold text-success-700">{gardesParMois[mois] || 0}</span>
                  garde{(gardesParMois[mois] || 0) > 1 ? 's' : ''} attribuée{(gardesParMois[mois] || 0) > 1 ? 's' : ''}
                  {souhaitMensuel ? ` / ${souhaitMensuel} souhaitée${souhaitMensuel > 1 ? 's' : ''}` : ''}
                </span>
              ))}
            </div>

            {!ficheMedecin && (
              <Card className="mb-4 border border-warning-300 bg-warning-50 p-4 text-sm font-semibold text-warning-800">
                Ce médecin n'a pas (encore) rempli ses desiderata — la fiche ci-dessous est vide.
              </Card>
            )}

            {/* Bloc jaune « À COMPLÉTER » de la fiche */}
            <Card className="mb-4 overflow-hidden p-0">
              <div className="bg-[#FFFF00] px-5 py-4">
                <p className="text-sm font-extrabold uppercase tracking-wide text-ink-900">
                  A compléter obligatoirement
                </p>
                <div className="mt-2 space-y-1 text-sm font-bold text-[#FF0000]">
                  <p>1 - Nombre de gardes par mois souhaité : {souhaitMensuel ?? '—'} /mois</p>
                  <p>2 - Gardes groupées dans un même week-end : {ouiNon(ficheMedecin?.gardesGroupees)}</p>
                  <p>3 - Les renforts associés à une garde : {ouiNon(ficheMedecin?.renfortsAssocies)}</p>
                </div>
              </div>
            </Card>

            {/* La fiche : DATES × créneaux, couleurs du fichier Excel */}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 border-b border-ink-300 bg-[#ED7D31] px-4 py-3 text-left text-xs font-extrabold uppercase text-ink-900">
                        Dates
                      </th>
                      {FICHE_COLONNES.map((col) => (
                        <th
                          key={col.id}
                          className="sticky top-0 z-20 min-w-[110px] border-b border-l border-ink-300 bg-[#ED7D31] px-3 py-3 text-left"
                        >
                          <div className="text-xs font-extrabold uppercase text-ink-900">{col.label}</div>
                          <div className="text-[0.7rem] font-semibold text-ink-800">{col.hours}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date, index) => {
                      const dateKey = date.toISOString().split('T')[0];
                      const jour = date.getDay();
                      const samedi = jour === 6;
                      const weekendOuFerie = jour === 0 || samedi || estJourFerie(dateKey);
                      const nouveauMois = index > 0 &&
                        dateKey.slice(0, 7) !== dates[index - 1].toISOString().slice(0, 7);
                      // Séparation entre les mois : bordure haute épaisse, comme l'export.
                      const bordMois = nouveauMois ? 'border-t-[3px] border-t-ink-900' : '';
                      const reponses = ficheMedecin?.desiderata?.[dateKey];
                      return (
                        <tr key={dateKey}>
                          <td className={`sticky left-0 z-10 whitespace-nowrap border-b border-ink-200 bg-white px-4 py-2 font-bold capitalize text-[#FF0000] ${bordMois}`}>
                            {date.toLocaleDateString('fr-FR', {
                              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                            })}
                          </td>
                          {FICHE_COLONNES.map((col) => {
                            // Renfort samedi : case NOIRE (condamnée) hors samedi,
                            // fond orange foncé le samedi — comme la fiche.
                            const condamnee = col.id === 'RENFORT_1' && !samedi;
                            const fond = condamnee
                              ? 'bg-black'
                              : col.id === 'RENFORT_1'
                                ? 'bg-[#C55A11]'
                                : weekendOuFerie
                                  ? 'bg-[#D0CECE]'
                                  : 'bg-white';
                            const pref = condamnee ? null : reponses?.[col.id];
                            const attribuee = !condamnee &&
                              (planningJours[dateKey]?.[col.id] || []).includes(selectedId);
                            return (
                              <td
                                key={col.id}
                                className={`border-b border-l border-ink-200 px-3 py-2 ${fond} ${bordMois}`}
                              >
                                {!condamnee && (
                                  <span className="flex items-center gap-1.5">
                                    <span className={`font-bold ${COULEUR_PREF[pref] || 'text-ink-400'}`}>
                                      {pref || ''}
                                    </span>
                                    {attribuee && (
                                      <span
                                        title="Garde attribuée dans le planning en cours"
                                        className="inline-flex shrink-0 items-center justify-center rounded-full bg-success-600 p-0.5 text-white"
                                      >
                                        <Check size={11} strokeWidth={3.5} aria-label="Garde attribuée" />
                                      </span>
                                    )}
                                  </span>
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

            {/* Légende */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-600">
              <span className="text-[#00B050]">Oui</span>
              <span className="text-[#FFC000]">Possible</span>
              <span className="text-[#FF0000]">Non</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center rounded-full bg-success-600 p-0.5 text-white">
                  <Check size={10} strokeWidth={3.5} aria-hidden="true" />
                </span>
                Garde attribuée dans le planning en cours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#D0CECE]" />
                Week-end / férié
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-black" />
                Renfort inexistant ce jour-là
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default DesiderataIndividuels;
