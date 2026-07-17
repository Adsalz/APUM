// src/components/QuickFill.js
import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Zap, ChevronDown, CalendarRange, Wand2 } from 'lucide-react';
import { Alert, Button, Checkbox, Select } from './ui';

const jours = [
  { id: '1', label: 'Lundi' },
  { id: '2', label: 'Mardi' },
  { id: '3', label: 'Mercredi' },
  { id: '4', label: 'Jeudi' },
  { id: '5', label: 'Vendredi' },
  { id: '6', label: 'Samedi' },
  { id: '0', label: 'Dimanche' }
];

function QuickFill({ creneaux, onApply, periodeSaisie }) {
  const [selectedCreneaux, setSelectedCreneaux] = useState({});
  const [selectedJours, setSelectedJours] = useState({});
  const [selectedDispo, setSelectedDispo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSelectFullPeriod = () => {
    if (periodeSaisie) {
      setValidationError('');
      setStartDate(periodeSaisie.startDate.split('T')[0]);
      setEndDate(periodeSaisie.endDate.split('T')[0]);
    }
  };

  const allCreneaux = creneaux.every(c => selectedCreneaux[c.id]);
  const allJours = jours.every(j => selectedJours[j.id]);

  const toggleAllCreneaux = () => {
    setValidationError('');
    const next = {};
    creneaux.forEach(c => { next[c.id] = !allCreneaux; });
    setSelectedCreneaux(next);
  };

  const toggleAllJours = () => {
    setValidationError('');
    const next = {};
    jours.forEach(j => { next[j.id] = !allJours; });
    setSelectedJours(next);
  };

  const handleApply = () => {
    if (!selectedDispo) {return setValidationError('Veuillez sélectionner une disponibilité');}
    if (!startDate || !endDate) {return setValidationError('Veuillez sélectionner une période');}

    const creneauxArray = Object.entries(selectedCreneaux).filter(([, v]) => v).map(([id]) => id);
    const joursArray = Object.entries(selectedJours).filter(([, v]) => v).map(([id]) => id);

    if (creneauxArray.length === 0) {return setValidationError('Veuillez sélectionner au moins un créneau');}
    if (joursArray.length === 0) {return setValidationError('Veuillez sélectionner au moins un jour');}

    setValidationError('');
    onApply({
      creneaux: creneauxArray,
      jours: joursArray,
      disponibilite: selectedDispo,
      startDate,
      endDate
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Zap size={16} />
          </span>
          <span className="font-bold text-ink-900">Remplissage rapide</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-400">
          {isExpanded ? 'Replier' : 'Déplier'}
          <ChevronDown size={18} className={twMerge('transition-transform', isExpanded && 'rotate-180')} />
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-5 border-t border-ink-100 p-5">
          {/* Période */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-700">Période de remplissage</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <span className="mb-1 block text-xs text-ink-500">Du</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setValidationError(''); setStartDate(e.target.value); }}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-xs text-ink-500">Au</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setValidationError(''); setEndDate(e.target.value); }}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>
              <Button variant="secondary" icon={<CalendarRange size={16} />} onClick={handleSelectFullPeriod}>
                Toute la période
              </Button>
            </div>
          </div>

          {/* Créneaux */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-ink-700">Créneaux</label>
              <button type="button" onClick={toggleAllCreneaux} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                {allCreneaux ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="grid gap-1 rounded-xl border border-ink-100 bg-ink-50/50 p-2 sm:grid-cols-2">
              {creneaux.map(creneau => (
                <div key={creneau.id} className="rounded-lg px-2 py-1.5 hover:bg-white">
                  <Checkbox
                    checked={selectedCreneaux[creneau.id] || false}
                    onChange={() => { setValidationError(''); setSelectedCreneaux(prev => ({ ...prev, [creneau.id]: !prev[creneau.id] })); }}
                    label={creneau.label}
                    description={creneau.hours}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Jours */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-ink-700">Jours de la semaine</label>
              <button type="button" onClick={toggleAllJours} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                {allJours ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-ink-100 bg-ink-50/50 p-2 sm:grid-cols-4">
              {jours.map(jour => (
                <div key={jour.id} className="rounded-lg px-2 py-1.5 hover:bg-white">
                  <Checkbox
                    checked={selectedJours[jour.id] || false}
                    onChange={() => { setValidationError(''); setSelectedJours(prev => ({ ...prev, [jour.id]: !prev[jour.id] })); }}
                    label={jour.label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Disponibilité */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-700">Disponibilité à appliquer</label>
            <Select
              value={selectedDispo}
              onChange={(e) => { setValidationError(''); setSelectedDispo(e.target.value); }}
              className="sm:max-w-xs"
            >
              <option value="">Sélectionnez une disponibilité</option>
              <option value="Oui">Oui</option>
              <option value="Possible">Possible</option>
              <option value="Non">Non</option>
            </Select>
          </div>

          {validationError && <Alert kind="warning">{validationError}</Alert>}

          <div className="flex justify-end">
            <Button variant="primary" icon={<Wand2 size={16} />} onClick={handleApply}>
              Appliquer le remplissage
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickFill;
