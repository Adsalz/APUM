// src/components/planning/PlanningTable.js
import React from 'react';
import {
  sortMedecinsByPreference,
  getPreferenceStyle,
  getMedecinPreference
} from '../../utils/planningUtils';
import { Select } from '../ui';

// Classes de pastille sémantiques dérivées de la préférence (présentation)
const preferencePill = (preference) => {
  switch (preference) {
  case 'Oui':
    return 'bg-success-50 text-success-700 ring-success-200';
  case 'Possible':
    return 'bg-warning-50 text-warning-700 ring-warning-200';
  case 'Non':
    return 'bg-danger-50 text-danger-700 ring-danger-200';
  default:
    return 'bg-primary-50 text-primary-700 ring-primary-200';
  }
};

// Teinte de fond de cellule dérivée de la préférence (présentation)
const preferenceCellBg = (preference) => {
  switch (preference) {
  case 'Oui':
    return 'bg-success-50';
  case 'Possible':
    return 'bg-warning-50';
  case 'Non':
    return 'bg-danger-50';
  default:
    return '';
  }
};

// Composant pour le sélecteur de médecin
// Modifiez la partie MedecinSelect comme suit :
const MedecinSelect = ({
  date,
  creneauId,
  index,
  currentValue,
  medecins,
  desiderata,
  selectedMedecin, // On garde ce paramètre pour l'affichage des infos mais pas pour le filtrage
  onChange
}) => {
  // Trier les médecins selon leurs préférences
  const sortedMedecins = sortMedecinsByPreference(medecins, desiderata, date, creneauId);

  return (
    <Select
      value={currentValue || ''}
      onChange={(e) => onChange(date, creneauId, index, e.target.value)}
    >
      <option value="">Non assigné</option>
      {sortedMedecins.all.map(medecin => {
        const preference = getMedecinPreference(desiderata, medecin.id, date, creneauId);
        const style = getPreferenceStyle(preference);
        const isSelected = medecin.id === selectedMedecin;

        return (
          <option
            key={medecin.id}
            value={medecin.id}
            style={{
              ...style,
              fontWeight: isSelected ? 'bold' : 'normal'
            }}
          >
              Dr. {medecin.prenom} {medecin.nom}
            {preference ? ` (${preference})` : ''}
            {isSelected ? ' ★' : ''}
          </option>
        );
      })}
    </Select>
  );
};

// Composant pour l'affichage des préférences
const PreferenceIndicator = ({ preference }) => {
  if (!preference) {return null;}

  return (
    <div className={`absolute right-2 top-2 rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${preferencePill(preference)}`}>
      {preference}
    </div>
  );
};

// Composant principal PlanningTable
const PlanningTable = ({
  planning,
  creneaux,
  medecins,
  desiderata,
  selectedMedecin,
  editMode,
  onMedecinChange,
  dateFilter,
  creneauFilter
}) => {
  // Fonction pour formatter la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Fonction pour vérifier si c'est un week-end
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Filtrer les dates selon les critères
  const getFilteredDates = () => {
    if (!planning || !planning.planning) {return [];}

    return Object.keys(planning.planning)
      .filter(date =>
        (!dateFilter.start || date >= dateFilter.start) &&
        (!dateFilter.end || date <= dateFilter.end)
      )
      .sort();
  };

  // Filtrer les créneaux selon les critères
  const getFilteredCreneaux = () => {
    return creneauFilter === 'all'
      ? creneaux
      : creneaux.filter(c => c.id === creneauFilter);
  };

  const headerCellClass =
    'border-b border-ink-100 bg-ink-50 px-4 py-3 text-left align-top';
  const headerLabelClass =
    'text-xs font-bold uppercase tracking-wide text-ink-500';

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: '120px' }} />{getFilteredCreneaux().map((creneau, index) => (
              <col key={index} style={{ width: `${100 / getFilteredCreneaux().length}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className={`${headerCellClass} sticky left-0 z-10`}>
                <span className={headerLabelClass}>Date</span>
              </th>
              {getFilteredCreneaux().map(creneau => (
                <th key={creneau.id} className={`${headerCellClass} min-w-[200px]`}>
                  <div className={headerLabelClass}>{creneau.label}</div>
                  <div className="mt-0.5 text-[0.7rem] font-normal text-ink-400">
                    {creneau.hours}
                  </div>
                  <div className="text-[0.7rem] font-normal text-ink-400">
                    {creneau.medecins} médecin{creneau.medecins > 1 ? 's' : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getFilteredDates().map(date => {
              const weekend = isWeekend(date);
              return (
                <tr key={date} className={weekend ? 'bg-primary-50/40' : 'bg-white'}>
                  <td
                    className={`sticky left-0 z-10 border-b border-ink-100 px-4 py-3 font-semibold text-ink-800 ${weekend ? 'bg-primary-50' : 'bg-white'}`}
                  >
                    {formatDate(date)}
                  </td>
                  {getFilteredCreneaux().map(creneau => {
                    const selPreference = selectedMedecin !== 'all'
                      ? getMedecinPreference(desiderata, selectedMedecin, date, creneau.id)
                      : '';
                    const selBg = selectedMedecin !== 'all' ? preferenceCellBg(selPreference) : '';
                    const cellBg = selBg || (weekend ? 'bg-primary-50/40' : '');

                    return (
                      <td
                        key={`${date}-${creneau.id}`}
                        className={`relative border-b border-ink-100 px-4 py-3 align-top ${cellBg}`}
                      >
                        {(!creneau.samediOnly || new Date(date).getDay() === 6) && (
                          <>
                            {selectedMedecin !== 'all' && (
                              <PreferenceIndicator
                                preference={getMedecinPreference(
                                  desiderata,
                                  selectedMedecin,
                                  date,
                                  creneau.id
                                )}
                              />
                            )}
                            <div className="flex flex-col gap-1.5">
                              {Array.from({ length: creneau.medecins }).map((_, index) => (
                                <div key={index}>
                                  {editMode ? (
                                    <MedecinSelect
                                      date={date}
                                      creneauId={creneau.id}
                                      index={index}
                                      currentValue={planning.planning[date]?.[creneau.id]?.[index]}
                                      medecins={medecins}
                                      desiderata={desiderata}
                                      selectedMedecin={selectedMedecin}
                                      onChange={onMedecinChange}
                                    />
                                  ) : (
                                    planning.planning[date]?.[creneau.id]?.[index] ? (
                                      (() => {
                                        const medecinId = planning.planning[date][creneau.id][index];
                                        const medecin = medecins.find(m => m.id === medecinId);
                                        const preference = getMedecinPreference(
                                          desiderata,
                                          medecinId,
                                          date,
                                          creneau.id
                                        );
                                        const isSelected = medecinId === selectedMedecin;

                                        return (
                                          <span
                                            className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${preferencePill(preference)} ${isSelected ? 'font-bold ring-2' : ''}`}
                                          >
                                              Dr. {medecin ?
                                              `${medecin.prenom} ${medecin.nom}` :
                                              'Médecin non trouvé'}
                                            {isSelected ? ' ★' : ''}
                                          </span>
                                        );
                                      })()
                                    ) : (
                                      <span className="inline-flex rounded-lg bg-ink-50 px-2 py-1 text-xs font-medium text-ink-400 ring-1 ring-inset ring-ink-100">
                                        Non assigné
                                      </span>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
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
    </div>
  );
};

export default PlanningTable;
