// src/components/WeeklyPattern.js
import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { CalendarRange, Copy, ChevronDown, CalendarDays } from 'lucide-react';
import { Alert, Button } from './ui';

const jours = [
  { id: '1', label: 'Lundi' },
  { id: '2', label: 'Mardi' },
  { id: '3', label: 'Mercredi' },
  { id: '4', label: 'Jeudi' },
  { id: '5', label: 'Vendredi' },
  { id: '6', label: 'Samedi' },
  { id: '0', label: 'Dimanche' }
];

const choiceStyles = {
  Oui: 'border-success-300 bg-success-50 text-success-700 focus:ring-success-500/30',
  Possible: 'border-warning-300 bg-warning-50 text-warning-700 focus:ring-warning-500/30',
  Non: 'border-danger-300 bg-danger-50 text-danger-700 focus:ring-danger-500/30',
  '': 'border-ink-200 bg-white text-ink-400 focus:ring-primary-500/25'
};

function WeeklyPattern({ creneaux, onApplyPattern, periodeSaisie }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pattern, setPattern] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handlePatternChange = (jour, creneau, value) => {
    setValidationError('');
    setPattern(prev => ({ ...prev, [jour]: { ...(prev[jour] || {}), [creneau]: value } }));
  };

  const handleSelectFullPeriod = () => {
    if (periodeSaisie) {
      setValidationError('');
      setStartDate(periodeSaisie.startDate.split('T')[0]);
      setEndDate(periodeSaisie.endDate.split('T')[0]);
    }
  };

  const handleApplyPattern = () => {
    if (!startDate || !endDate) {return setValidationError('Veuillez sélectionner une période');}
    if (Object.keys(pattern).length === 0) {return setValidationError('Veuillez définir au moins une préférence dans le modèle');}
    setValidationError('');
    onApplyPattern(pattern, startDate, endDate);
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
            <CalendarDays size={16} />
          </span>
          <span className="font-bold text-ink-900">Modèle hebdomadaire</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-500">
          {isExpanded ? 'Replier' : 'Déplier'}
          <ChevronDown size={18} className={twMerge('transition-transform', isExpanded && 'rotate-180')} />
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-5 border-t border-ink-100 p-5">
          <p className="text-sm text-ink-500">
            Définissez votre semaine type ci-dessous. Ce modèle sera appliqué automatiquement sur la période sélectionnée.
          </p>

          <div className="overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-ink-100 bg-ink-50 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                    Jour
                  </th>
                  {creneaux.map(creneau => (
                    <th key={creneau.id} className="border-b border-l border-ink-100 bg-ink-50 px-4 py-2.5 text-left">
                      <div className="font-bold text-ink-800">{creneau.label}</div>
                      <div className="text-xs font-medium text-ink-500">{creneau.hours}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jours.map((jour, idx) => (
                  <tr key={jour.id} className={idx % 2 === 1 ? 'bg-ink-50/40' : 'bg-white'}>
                    <td className="border-b border-ink-100 px-4 py-2 font-semibold text-ink-800">{jour.label}</td>
                    {creneaux.map(creneau => {
                      const value = pattern[jour.id]?.[creneau.id] || '';
                      const disabled = creneau.samediOnly && jour.id !== '6';
                      return (
                        <td key={creneau.id} className="border-b border-l border-ink-100 px-3 py-2">
                          {!disabled ? (
                            <div className="relative">
                              <select
                                value={value}
                                onChange={(e) => handlePatternChange(jour.id, creneau.id, e.target.value)}
                                aria-label={`Disponibilité ${jour.label} — ${creneau.label}`}
                                className={twMerge(
                                  'w-full appearance-none rounded-lg border py-1.5 pl-2.5 pr-7 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2',
                                  choiceStyles[value] || choiceStyles['']
                                )}
                              >
                                <option value="">—</option>
                                <option value="Oui">Oui</option>
                                <option value="Possible">Possible</option>
                                <option value="Non">Non</option>
                              </select>
                              <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" />
                            </div>
                          ) : (
                            <span className="block text-center text-xs text-ink-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Période */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="weekly-pattern-start" className="mb-1 block text-xs text-ink-500">Du</label>
              <input
                id="weekly-pattern-start"
                type="date"
                value={startDate}
                onChange={(e) => { setValidationError(''); setStartDate(e.target.value); }}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="weekly-pattern-end" className="mb-1 block text-xs text-ink-500">Au</label>
              <input
                id="weekly-pattern-end"
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

          {validationError && <Alert kind="warning">{validationError}</Alert>}

          <div className="flex justify-end">
            <Button variant="primary" icon={<Copy size={16} />} onClick={handleApplyPattern}>
              Appliquer le modèle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyPattern;
