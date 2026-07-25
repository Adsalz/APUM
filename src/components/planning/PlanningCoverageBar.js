// src/components/planning/PlanningCoverageBar.js
// Bandeau de pilotage du comblement manuel.
//
// Le générateur laisse volontairement des places vides (il ne dépasse jamais le
// quota déclaré par un médecin) : combler ces trous est le travail principal de
// l'admin sur cet écran. Ce bandeau lui donne les trois choses qui manquaient :
// combien il en reste, où est la suivante, et si le planning viole une contrainte.
import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowDownToLine, ListFilter } from 'lucide-react';
import { Button } from '../ui';

const PlanningCoverageBar = ({
  analyse,
  seulementIncomplets,
  onToggleIncomplets,
  onPlaceVideSuivante
}) => {
  if (!analyse || analyse.places === 0) { return null; }

  const { places, pourvues, vides, violationsDures, violationsFortes } = analyse;
  const pct = Math.round((pourvues / places) * 100);
  const complet = vides === 0;
  const sain = violationsDures === 0;

  return (
    <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[16rem] flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-ink-800">Remplissage du planning</span>
            <span className="tabular-nums text-sm font-bold text-ink-900">
              {pourvues} / {places} <span className="font-normal text-ink-500">({pct} %)</span>
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Taux de remplissage du planning"
          >
            <div
              className={`h-full rounded-full transition-all ${complet ? 'bg-success-500' : 'bg-primary-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {complet ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-2.5 py-1.5 text-sm font-semibold text-success-700 ring-1 ring-inset ring-success-200">
              <CheckCircle2 size={16} aria-hidden="true" />
              Toutes les places sont pourvues
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning-50 px-2.5 py-1.5 text-sm font-semibold text-warning-800 ring-1 ring-inset ring-warning-200">
              <AlertTriangle size={16} aria-hidden="true" />
              {vides} place{vides > 1 ? 's' : ''} à pourvoir
            </span>
          )}

          {!sain && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-danger-50 px-2.5 py-1.5 text-sm font-semibold text-danger-700 ring-1 ring-inset ring-danger-200">
              <AlertTriangle size={16} aria-hidden="true" />
              {violationsDures} contrainte{violationsDures > 1 ? 's' : ''} dure{violationsDures > 1 ? 's' : ''} violée{violationsDures > 1 ? 's' : ''}
            </span>
          )}
          {sain && violationsFortes > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning-50 px-2.5 py-1.5 text-sm font-semibold text-warning-800 ring-1 ring-inset ring-warning-200">
              <AlertTriangle size={16} aria-hidden="true" />
              {violationsFortes} affectation{violationsFortes > 1 ? 's' : ''} à vérifier
            </span>
          )}
        </div>
      </div>

      {!complet && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowDownToLine size={16} aria-hidden="true" />}
            onClick={onPlaceVideSuivante}
          >
            Place vide suivante
          </Button>
          <Button
            variant={seulementIncomplets ? 'primary' : 'ghost'}
            size="sm"
            icon={<ListFilter size={16} aria-hidden="true" />}
            onClick={onToggleIncomplets}
            aria-pressed={seulementIncomplets}
          >
            {seulementIncomplets ? 'Afficher tous les jours' : 'Afficher seulement les jours à compléter'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlanningCoverageBar;
