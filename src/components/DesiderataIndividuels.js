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
  const medecinSelectionne = medecins.find((m) => m.id === selectedId);
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
            {/* Gardes attribuées par mois vs souhait mensuel : le mois passe en
                vert quand le souhait est atteint. */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {moisPeriode.map((mois) => {
                const attribuees = gardesParMois[mois] || 0;
                const objectifAtteint = souhaitMensuel && attribuees >= souhaitMensuel;
                return (
                  <span
                    key={mois}
                    className={`inline-flex items-baseline gap-1.5 rounded-full px-3.5 py-1.5 text-xs ring-1 ring-inset ${
                      objectifAtteint
                        ? 'bg-success-50 text-success-800 ring-success-300'
                        : 'bg-white text-ink-700 ring-ink-200'
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wide opacity-70">{libelleMoisAnnee(mois)}</span>
                    <span className="text-sm font-extrabold">{attribuees}</span>
                    <span className="font-semibold">
                      garde{attribuees > 1 ? 's' : ''}{souhaitMensuel ? ` / ${souhaitMensuel} souhaitée${souhaitMensuel > 1 ? 's' : ''}` : ' attribuée' + (attribuees > 1 ? 's' : '')}
                    </span>
                  </span>
                );
              })}
            </div>

            {!ficheMedecin && (
              <Card className="mb-4 border border-warning-300 bg-warning-50 p-4 text-sm font-semibold text-warning-800">
                Ce médecin n'a pas (encore) rempli ses desiderata — la fiche ci-dessous est vide.
              </Card>
            )}

            {/* En-tête de la fiche : nom du médecin + bloc jaune « À COMPLÉTER »
                recomposé en trois réponses lisibles (jaune et rouge de la fiche
                conservés, appliqués avec plus de retenue). */}
            <Card className="mb-4 overflow-hidden p-0">
              <div className="flex flex-wrap items-baseline gap-x-2 border-b border-ink-100 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Nom et prénom</span>
                <span className="text-base font-extrabold text-ink-900">
                  Dr {medecinSelectionne?.prenom} {(medecinSelectionne?.nom || '').toUpperCase()}
                </span>
              </div>
              <div className="relative bg-[#FFFF00]/20 px-5 py-4 pl-6">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#FFE699]" />
                <p className="text-[0.7rem] font-extrabold uppercase tracking-widest text-ink-500">
                  À compléter obligatoirement
                </p>
                <dl className="mt-2.5 grid gap-x-8 gap-y-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold text-ink-600">Gardes souhaitées par mois</dt>
                    <dd className="mt-0.5 text-lg font-extrabold leading-tight text-[#FF0000]">{souhaitMensuel ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-ink-600">Gardes groupées le même week-end</dt>
                    <dd className="mt-0.5 text-lg font-extrabold leading-tight text-[#FF0000]">{ouiNon(ficheMedecin?.gardesGroupees)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-ink-600">Renforts associés à une garde</dt>
                    <dd className="mt-0.5 text-lg font-extrabold leading-tight text-[#FF0000]">{ouiNon(ficheMedecin?.renfortsAssocies)}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* La fiche : DATES × créneaux, couleurs du fichier Excel */}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 border-b-2 border-b-[#C55A11] bg-[#ED7D31] px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-ink-900">
                        Dates
                      </th>
                      {FICHE_COLONNES.map((col) => (
                        <th
                          key={col.id}
                          className="sticky top-0 z-20 min-w-[110px] border-b-2 border-b-[#C55A11] border-l border-l-white/40 bg-[#ED7D31] px-3 py-3 text-left"
                        >
                          <div className="text-xs font-extrabold uppercase tracking-wide text-ink-900">{col.label}</div>
                          <div className="text-[0.7rem] font-semibold text-ink-900/60">{col.hours}</div>
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
                      const bordMois = nouveauMois ? 'border-t-[3px] border-t-ink-800' : '';
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
                                    {/* Sur le fond orange foncé du renfort samedi, le
                                        texte passe en blanc pour rester lisible. */}
                                    <span className={`font-bold ${col.id === 'RENFORT_1' ? 'text-white' : (COULEUR_PREF[pref] || 'text-ink-400')}`}>
                                      {pref || ''}
                                    </span>
                                    {attribuee && (
                                      <span
                                        title="Garde attribuée dans le planning en cours"
                                        className="inline-flex shrink-0 items-center justify-center rounded-full bg-success-600 p-0.5 text-white shadow-sm ring-2 ring-white/70"
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
