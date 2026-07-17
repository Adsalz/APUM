// src/components/desiderata/DesiderataTable.js
// Grille de saisie des disponibilités (dates × créneaux) partagée par les deux
// écrans. Composant présentiel : reçoit les dates, les créneaux, la valeur
// courante et un callback de modification.
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Card } from '../ui';
import { estJourFerie } from '../../utils/joursFeries';
import { CHOIX_DISPONIBILITE } from '../../constants/creneaux';

// Habillage coloré du sélecteur de choix selon la valeur.
const choiceStyles = {
  Oui: 'border-success-300 bg-success-50 text-success-700 focus:ring-success-500/30',
  Possible: 'border-warning-300 bg-warning-50 text-warning-700 focus:ring-warning-500/30',
  Non: 'border-danger-300 bg-danger-50 text-danger-700 focus:ring-danger-500/30',
  '': 'border-ink-200 bg-white text-ink-500 focus:ring-primary-500/25',
};

const stickyLeft = 'sticky left-0 z-10';

function isWeekendOrHoliday(date) {
  const day = date.getDay();
  const formattedDate = date.toISOString().split('T')[0];
  return day === 0 || day === 6 || estJourFerie(formattedDate);
}

function formatDate(date) {
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  return {
    day: days[date.getDay()],
    num: date.getDate().toString().padStart(2, '0'),
    month: months[date.getMonth()],
  };
}

function DesiderataTable({ dates, creneaux, desiderata, onChange }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
          <Sparkles size={15} className="text-primary-500" aria-hidden="true" />
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
              <th
                className={twMerge(
                  'bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500',
                  'sticky left-0 top-0 z-30 border-b border-ink-200'
                )}
              >
                Date
              </th>
              {creneaux.map((creneau) => (
                <th
                  key={creneau.id}
                  className="sticky top-0 z-20 min-w-[150px] border-b border-l border-ink-100 bg-ink-50 px-4 py-3 text-left"
                >
                  <div className="font-bold text-ink-800">{creneau.label}</div>
                  <div className="text-xs font-medium text-ink-500">{creneau.hours}</div>
                  <div className="text-[11px] text-ink-500">
                    {creneau.medecins} médecin{creneau.medecins > 1 ? 's' : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const isHighlighted = isWeekendOrHoliday(date);
              const dateString = date.toISOString().split('T')[0];
              const rowBg = isHighlighted ? 'bg-primary-50/40' : 'bg-white';
              const d = formatDate(date);
              return (
                <tr key={dateString} className={twMerge('group', rowBg)}>
                  <td
                    className={twMerge(
                      'border-b border-ink-100 px-4 py-2.5 font-semibold',
                      stickyLeft,
                      rowBg
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className={twMerge(
                          'text-xs font-bold uppercase',
                          isHighlighted ? 'text-primary-600' : 'text-ink-500'
                        )}
                      >
                        {d.day}
                      </span>
                      <span className="text-ink-900">{d.num}</span>
                      <span className="text-xs text-ink-500">{d.month}</span>
                    </span>
                  </td>
                  {creneaux.map((creneau) => {
                    const value = desiderata[dateString]?.[creneau.id] || '';
                    const disabled = creneau.samediOnly && date.getDay() !== 6;
                    return (
                      <td
                        key={`${dateString}-${creneau.id}`}
                        className="border-b border-l border-ink-100 px-3 py-2"
                      >
                        {!disabled ? (
                          <div className="relative">
                            <select
                              value={value}
                              aria-label={`Disponibilité ${d.day} ${d.num} ${d.month} — ${creneau.label} ${creneau.hours}`}
                              onChange={(e) => onChange(dateString, creneau.id, e.target.value)}
                              className={twMerge(
                                'w-full appearance-none rounded-lg border py-1.5 pl-2.5 pr-7 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2',
                                choiceStyles[value] || choiceStyles['']
                              )}
                            >
                              <option value="">—</option>
                              {CHOIX_DISPONIBILITE.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
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
  );
}

export default DesiderataTable;
