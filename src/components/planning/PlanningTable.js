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

// Fonds par créneau : le pigment EXACT des exports Excel (bleu B4C6E7, jaune
// FFE699, rose FF99FF, vert C6E0B4, gris D9D9D9). Couleur PLEINE sur les
// en-têtes et les week-ends (le repère week-end reste lisible dans la grille),
// voile du même pigment les jours de semaine pour laisser respirer les
// pastilles d'alerte. `accent` : liseré des cartes mobiles.
const TEINTES_CRENEAU = {
  QUART_1: { th: 'bg-[#B4C6E7]', td: 'bg-[#B4C6E7]/60', we: 'bg-[#B4C6E7]', accent: 'border-l-[#B4C6E7]' },
  QUART_2: { th: 'bg-[#FFE699]', td: 'bg-[#FFE699]/60', we: 'bg-[#FFE699]', accent: 'border-l-[#FFE699]' },
  RENFORT_1: { th: 'bg-[#FF99FF]', td: 'bg-[#FF99FF]/50', we: 'bg-[#FF99FF]/80', accent: 'border-l-[#FF99FF]' },
  QUART_3: { th: 'bg-[#C6E0B4]', td: 'bg-[#C6E0B4]/60', we: 'bg-[#C6E0B4]', accent: 'border-l-[#C6E0B4]' },
  QUART_4: { th: 'bg-[#D9D9D9]', td: 'bg-[#D9D9D9]/60', we: 'bg-[#D9D9D9]', accent: 'border-l-[#D9D9D9]' },
  RENFORT_2: { th: 'bg-[#FF99FF]', td: 'bg-[#FF99FF]/50', we: 'bg-[#FF99FF]/80', accent: 'border-l-[#FF99FF]' },
};

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
  // Place vide : c'est CE que l'admin cherche → blanc PLEIN sur le fond coloré
  // de la colonne, bord pointillé appuyé. Une place pourvue sans problème est
  // au contraire translucide et se fond dans la couleur du créneau.
  if (!nom && !prenom) {
    return (
      <span
        id={id}
        className="inline-flex items-center gap-1 rounded-lg border-2 border-dashed border-warning-500 bg-white px-2 py-1 text-xs font-bold text-warning-800 shadow-sm"
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
      : 'bg-white/40 text-ink-900 ring-ink-900/10';

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
      <span className="h-3 w-3 rounded border-2 border-dashed border-warning-500 bg-white" />
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
                <th className="sticky left-0 z-10 bg-ink-50 px-3 py-3 text-left align-top shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)]">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-ink-500">Date</span>
                </th>
                {creneauxAffiches.map((creneau) => (
                  <th
                    key={creneau.id}
                    className={`min-w-[190px] border-l border-l-white/70 px-3 py-3 text-left align-top shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)] ${TEINTES_CRENEAU[creneau.id]?.th || 'bg-ink-50'}`}
                  >
                    <div className="text-xs font-extrabold uppercase tracking-wide text-ink-800">
                      {creneau.label.replace(/\s*\(.*\)$/, '')}
                    </div>
                    <div className="mt-0.5 text-[0.7rem] font-semibold text-ink-700/70">{creneau.hours || ''}</div>
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
                      // Créneau fermé ce jour (ex. renfort hors samedi) : pas de
                      // teinte, comme la colonne blanche du fichier Excel.
                      const teinte = nbSlots > 0 ? TEINTES_CRENEAU[creneau.id] : null;
                      const fondCellule = teinte
                        ? (weekend ? teinte.we : teinte.td)
                        : (weekend ? 'bg-primary-50/40' : '');
                      return (
                        <td
                          key={creneau.id}
                          className={`border-b border-ink-100 border-l border-l-white/70 px-3 py-3 align-top ${fondCellule}`}
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
                  const teinte = TEINTES_CRENEAU[creneau.id];
                  return (
                    <div
                      key={creneau.id}
                      className={`rounded-xl border-l-4 px-3 py-2.5 ${teinte?.td || ''} ${teinte?.accent || 'border-l-transparent'}`}
                    >
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-ink-600">
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
