// src/components/planning/PlanningTable.js
// Grille du planning (dates × créneaux), en lecture et en édition.
//
// Choix de lisibilité issus de l'audit :
//  - une place VIDE est ce que l'admin cherche : elle est donc plus visible qu'une
//    place pourvue (et non l'inverse, comme c'était le cas) ;
//  - la couleur n'est plus dérivée de la préférence (code muet, sans légende, qui
//    colorait 100 % des cases) mais des PROBLÈMES réels, avec une légende explicite ;
//  - au-dessous de `lg`, la table (1 320 px minimum) est remplacée par des cartes
//    par jour, utilisables au doigt.
import React, { useMemo, useRef } from 'react';
import { AlertTriangle, CalendarX2 } from 'lucide-react';
import { effectifPour } from '../../utils/planningCore';
import { libelleMoisAnnee } from '../../utils/mois';
import {
  cleSlot,
  preferencePour,
  souhaitMensuelDe,
  gardesDuMois,
  pireNiveau,
  NIVEAUX
} from '../../utils/planningEdition';
import MedecinSlotSelect from './components/MedecinSlotSelect';
import useMediaQuery from '../../hooks/useMediaQuery';

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${JOURS[date.getUTCDay()]} ${date.getUTCDate()} ${MOIS[date.getUTCMonth()]}`;
};

const estWeekEnd = (dateString) => {
  const jour = new Date(dateString).getUTCDay();
  return jour === 0 || jour === 6;
};

const prefPill = (preference) => {
  switch (preference) {
  case 'Oui': return 'bg-success-50 text-success-700 ring-success-200';
  case 'Possible': return 'bg-warning-50 text-warning-700 ring-warning-200';
  case 'Non': return 'bg-danger-50 text-danger-700 ring-danger-200';
  default: return 'bg-ink-100 text-ink-500 ring-ink-200';
  }
};

// Identifiant DOM stable d'une place : permet la navigation « place vide suivante ».
export const idSlot = (date, creneauId, index) => `slot-${date}-${creneauId}-${index}`;

// ---------------------------------------------------------------------------
// Une place, en LECTURE
// ---------------------------------------------------------------------------
const SlotLecture = React.memo(function SlotLecture({
  id, nom, prenom, niveau, detailProblemes, estFiltre
}) {
  if (!nom && !prenom) {
    return (
      <span
        id={id}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-warning-400 bg-warning-50/50 px-2 py-1 text-xs font-semibold text-warning-800"
      >
        <CalendarX2 size={12} aria-hidden="true" />
        Non pourvu
      </span>
    );
  }

  const classe = niveau === NIVEAUX.DUR
    ? 'bg-danger-50 text-danger-800 ring-danger-300'
    : niveau === NIVEAUX.FORT
      ? 'bg-warning-50 text-warning-800 ring-warning-300'
      : 'bg-ink-50 text-ink-800 ring-ink-200';

  return (
    <span
      id={id}
      title={detailProblemes || undefined}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1 ring-inset ${classe} ${estFiltre ? 'ring-2 ring-primary-500' : ''}`}
    >
      {niveau && <AlertTriangle size={11} aria-hidden="true" className="shrink-0" />}
      <span className="font-semibold">{nom || 'Médecin inconnu'}</span>
      {prenom && <span className="font-normal opacity-70">{prenom}</span>}
      {estFiltre ? ' ★' : ''}
    </span>
  );
});

// ---------------------------------------------------------------------------
// Contenu d'une cellule (toutes les places d'un créneau pour une date)
// ---------------------------------------------------------------------------
// Ne transmet aux composants de place que des PRIMITIVES (plus le contexte, qui
// est une ref stable) : c'est la condition pour que leur mémoïsation serve à
// quelque chose. Une affectation ne re-rend alors que les places réellement
// concernées, au lieu des ~1 158 sélecteurs de la période.
const CelluleCreneau = ({
  date, creneau, occupants, nbSlots, editMode,
  medecinsById, idxDesiderata, idxPlanning, selectedMedecin,
  onMedecinChange, problemesParSlot, ctx
}) => {
  if (nbSlots === 0) { return null; }

  const dateLabel = formatDate(date);

  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: nbSlots }).map((_, index) => {
        const medecinId = occupants?.[index] || null;
        const medecin = medecinId ? medecinsById.get(medecinId) : null;
        const problemes = problemesParSlot.get(cleSlot(date, creneau.id, index));
        const niveau = pireNiveau(problemes);

        return editMode ? (
          <div key={index} id={idSlot(date, creneau.id, index)}>
            <MedecinSlotSelect
              date={date}
              creneauId={creneau.id}
              index={index}
              currentValue={medecinId}
              nom={medecin?.nom || ''}
              prenom={medecin?.prenom || ''}
              souhait={medecinId ? souhaitMensuelDe(idxDesiderata, medecinId) : 0}
              attribuees={medecinId ? gardesDuMois(idxPlanning, date, medecinId) : 0}
              niveauProbleme={niveau}
              onChange={onMedecinChange}
              dateLabel={dateLabel}
              creneauLabel={creneau.label}
              ctx={ctx}
            />
          </div>
        ) : (
          <div key={index}>
            <SlotLecture
              id={idSlot(date, creneau.id, index)}
              nom={medecin?.nom || (medecinId ? 'Médecin inconnu' : '')}
              prenom={medecin?.prenom || ''}
              niveau={niveau}
              detailProblemes={problemes ? problemes.map((p) => p.libelle).join(' · ') : ''}
              estFiltre={medecinId === selectedMedecin}
            />
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Légende
// ---------------------------------------------------------------------------
const Legende = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink-100 bg-ink-50/60 px-4 py-2 text-[0.7rem] text-ink-600">
    <span className="font-semibold uppercase tracking-wide text-ink-400">Légende</span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded border border-dashed border-warning-400 bg-warning-50" />
      Place non pourvue
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded bg-danger-100 ring-1 ring-inset ring-danger-300" />
      Contrainte dure violée (chevauchement, 3 jours consécutifs, max/semaine)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded bg-warning-100 ring-1 ring-inset ring-warning-300" />
      À vérifier (a répondu « Non », quota mensuel dépassé)
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
const PlanningTable = ({
  planning,
  creneaux,
  medecins,
  medecinsById,
  idxDesiderata,
  idxPlanning,
  problemesParSlot,
  selectedMedecin,
  editMode,
  onMedecinChange,
  dateFilter,
  creneauFilter,
  seulementIncomplets = false
}) => {
  const planningJours = useMemo(() => planning?.planning || {}, [planning]);
  // Une seule des deux mises en page est MONTÉE : les masquer en CSS doublerait
  // le nombre de sélecteurs rendus (plus de 2 000 sur une période de 3 mois).
  const grandEcran = useMediaQuery('(min-width: 1024px)');

  const creneauxAffiches = useMemo(
    () => (creneauFilter === 'all' ? creneaux : creneaux.filter((c) => c.id === creneauFilter)),
    [creneaux, creneauFilter]
  );

  const dates = useMemo(() => {
    const toutes = Object.keys(planningJours)
      .filter((date) =>
        (!dateFilter.start || date >= dateFilter.start) &&
        (!dateFilter.end || date <= dateFilter.end))
      .sort();
    if (!seulementIncomplets) { return toutes; }
    return toutes.filter((date) =>
      creneauxAffiches.some((c) => (planningJours[date]?.[c.id] || []).some((m) => !m)));
  }, [planningJours, dateFilter.start, dateFilter.end, seulementIncomplets, creneauxAffiches]);

  // Données lourdes exposées aux sélecteurs via une REF d'identité stable :
  // le menu ouvert lit `ctx.current` au moment de son ouverture, donc toujours à
  // jour, sans casser la mémoïsation des ~1 158 sélecteurs fermés.
  const ctx = useRef({});
  ctx.current = { medecins, idxDesiderata, idxPlanning, planningJours, selectedMedecin };

  const propsCellule = {
    medecinsById, idxDesiderata, idxPlanning,
    selectedMedecin, onMedecinChange, problemesParSlot, ctx
  };

  const largeurColonne = `${100 / Math.max(1, creneauxAffiches.length)}%`;

  // Bandeaux de séparation entre les mois, uniquement si la période affichée
  // en couvre plusieurs (demande admin).
  const multiMois = new Set(dates.map((d) => d.slice(0, 7))).size > 1;
  const debutDeMois = (index) => multiMois &&
    (index === 0 || dates[index].slice(0, 7) !== dates[index - 1].slice(0, 7));
  const bandeauMois = 'border-y-2 border-ink-200 bg-ink-100 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-600';

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
        <p className="font-semibold text-ink-800">
          {seulementIncomplets ? 'Aucune place à compléter' : 'Aucune date sur cette période'}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {seulementIncomplets
            ? 'Toutes les places des créneaux affichés sont pourvues.'
            : 'Ajustez les filtres de période pour afficher des dates.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white shadow-card">
      <Legende />

      {/* ---------- Table (≥ lg) ---------- */}
      {grandEcran && (
        <div className="w-full overflow-x-auto rounded-b-2xl">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '108px' }} />
              {creneauxAffiches.map((c) => (
                <col key={c.id} style={{ width: largeurColonne }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-ink-100 bg-ink-50 px-3 py-3 text-left align-top">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-500">Date</span>
                </th>
                {creneauxAffiches.map((creneau) => (
                  <th key={creneau.id} className="min-w-[190px] border-b border-ink-100 bg-ink-50 px-3 py-3 text-left align-top">
                    <div className="text-xs font-bold uppercase tracking-wide text-ink-500">
                      {creneau.label.replace(/\s*\(.*\)$/, '')}
                    </div>
                    <div className="mt-0.5 text-[0.7rem] font-normal text-ink-500">{creneau.hours || ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date, index) => {
                const weekend = estWeekEnd(date);
                return (
                  <React.Fragment key={date}>
                  {debutDeMois(index) && (
                    <tr>
                      <td colSpan={creneauxAffiches.length + 1} className={bandeauMois}>
                        <span className="sticky left-0 inline-block">{libelleMoisAnnee(date)}</span>
                      </td>
                    </tr>
                  )}
                  <tr className={weekend ? 'bg-primary-50/40' : 'bg-white'}>
                    <td className={`sticky left-0 z-10 border-b border-ink-100 px-3 py-3 align-top text-sm font-semibold text-ink-800 ${weekend ? 'bg-primary-50' : 'bg-white'}`}>
                      {formatDate(date)}
                    </td>
                    {creneauxAffiches.map((creneau) => {
                      const occupants = planningJours[date]?.[creneau.id];
                      const nbSlots = occupants?.length ?? effectifPour(creneau.id, date);
                      const pref = selectedMedecin !== 'all'
                        ? preferencePour(idxDesiderata, selectedMedecin, date, creneau.id)
                        : '';
                      return (
                        <td
                          key={creneau.id}
                          className={`border-b border-ink-100 px-3 py-3 align-top ${weekend ? 'bg-primary-50/40' : ''}`}
                        >
                          {nbSlots > 0 && (
                            <>
                              {/* Préférence du médecin filtré : en tête de cellule,
                                  plus en superposition par-dessus le 1er sélecteur. */}
                              {selectedMedecin !== 'all' && (
                                <div className={`mb-1.5 inline-flex rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset ${prefPill(pref)}`}>
                                  {pref || 'Pas de réponse'}
                                </div>
                              )}
                              <CelluleCreneau
                                date={date}
                                creneau={creneau}
                                occupants={occupants}
                                nbSlots={nbSlots}
                                editMode={editMode}
                                {...propsCellule}
                              />
                            </>
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

      {/* ---------- Cartes par jour (< lg) ---------- */}
      {!grandEcran && (
        <div className="divide-y divide-ink-100">
        {dates.map((date, index) => {
          const weekend = estWeekEnd(date);
          return (
            <React.Fragment key={date}>
            {debutDeMois(index) && (
              <div className={bandeauMois}>{libelleMoisAnnee(date)}</div>
            )}
            <section className={weekend ? 'bg-primary-50/40' : ''}>
              <h3 className="sticky top-16 z-10 border-b border-ink-100 bg-ink-50/95 px-4 py-2 text-sm font-bold text-ink-800 backdrop-blur">
                {formatDate(date)}
              </h3>
              <div className="space-y-3 px-4 py-3">
                {creneauxAffiches.map((creneau) => {
                  const occupants = planningJours[date]?.[creneau.id];
                  const nbSlots = occupants?.length ?? effectifPour(creneau.id, date);
                  if (nbSlots === 0) { return null; }
                  return (
                    <div key={creneau.id}>
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-ink-500">
                          {creneau.label.replace(/\s*\(.*\)$/, '')}
                        </span>
                        <span className="text-[0.7rem] text-ink-400">{creneau.hours || ''}</span>
                      </div>
                      <CelluleCreneau
                        date={date}
                        creneau={creneau}
                        occupants={occupants}
                        nbSlots={nbSlots}
                        editMode={editMode}
                        {...propsCellule}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
            </React.Fragment>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default PlanningTable;
