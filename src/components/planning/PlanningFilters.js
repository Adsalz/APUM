// src/components/planning/PlanningFilters.js
import React from 'react';
import { Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import MedecinSearchSelect from './components/MedecinSearchSelect';
import { Card, Select } from '../ui';

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 shadow-sm ' +
  'transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25';

const PlanningFilters = ({
  showFilters,
  onToggleFilters,
  dateFilter,
  onDateFilterChange,
  creneauFilter,
  onCreneauFilterChange,
  selectedMedecin,
  onMedecinFilterChange,
  medecins,
  creneaux
}) => {
  return (
    <Card className="mb-6 overflow-visible p-0">
      <button
        type="button"
        onClick={onToggleFilters}
        className="flex w-full items-center justify-between rounded-2xl px-6 py-4 text-left transition-colors hover:bg-ink-50"
      >
        <span className="flex items-center gap-2 font-semibold text-ink-800">
          <Filter size={20} aria-hidden="true" className="text-ink-400" />
          Filtres et recherche
        </span>
        {showFilters
          ? <ChevronUp size={20} aria-hidden="true" className="text-ink-400" />
          : <ChevronDown size={20} aria-hidden="true" className="text-ink-400" />}
      </button>

      {showFilters && (
        <div className="border-t border-ink-100 px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtre par période */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-700">
                Période
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  aria-label="Date de début"
                  value={dateFilter.start}
                  onChange={(e) => onDateFilterChange({ ...dateFilter, start: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="date"
                  aria-label="Date de fin"
                  value={dateFilter.end}
                  onChange={(e) => onDateFilterChange({ ...dateFilter, end: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Filtre par créneau */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-700">
                Créneau
              </label>
              <Select
                value={creneauFilter}
                onChange={(e) => onCreneauFilterChange(e.target.value)}
              >
                <option value="all">Tous les créneaux</option>
                {creneaux.map(creneau => (
                  <option key={creneau.id} value={creneau.id}>
                    {creneau.label} ({creneau.hours})
                  </option>
                ))}
              </Select>
            </div>

            {/* Filtre par médecin */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-700">
                Médecin
              </label>
              <MedecinSearchSelect
                medecins={medecins}
                value={selectedMedecin}
                onChange={onMedecinFilterChange}
                placeholder="Rechercher un médecin..."
              />
              {/* Fiche desiderata au format Excel, dans un onglet séparé : permet
                  de garder le planning et la fiche côte à côte. */}
              <a
                href={selectedMedecin !== 'all'
                  ? `/desiderata-individuels?medecin=${selectedMedecin}`
                  : '/desiderata-individuels'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 hover:underline"
              >
                <ExternalLink size={13} aria-hidden="true" />
                Voir la fiche desiderata (nouvel onglet)
              </a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PlanningFilters;
