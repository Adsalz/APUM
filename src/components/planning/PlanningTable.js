// src/components/planning/PlanningTable.js
import React from 'react';
import { 
  sortMedecinsByPreference, 
  getPreferenceStyle, 
  getMedecinPreference 
} from '../../utils/planningUtils';

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
      <select
        value={currentValue || ''}
        onChange={(e) => onChange(date, creneauId, index, e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem',
          borderRadius: '0.375rem',
          border: '1px solid #D1D5DB',
          backgroundColor: 'white',
          fontSize: '0.875rem'
        }}
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
      </select>
    );
  };

// Composant pour l'affichage des préférences
const PreferenceIndicator = ({ preference }) => {
  if (!preference) return null;
  
  const style = getPreferenceStyle(preference);
  return (
    <div style={{
      position: 'absolute',
      top: '0.25rem',
      right: '0.25rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      ...style
    }}>
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
    if (!planning || !planning.planning) return [];

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

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflowX: 'auto'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem'
      }}>
        <thead>
          <tr>
            <th style={{
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              textAlign: 'left',
              fontWeight: '600',
              position: 'sticky',
              left: 0,
              zIndex: 10,
              backgroundColor: 'white'
            }}>
              Date
            </th>
            {getFilteredCreneaux().map(creneau => (
              <th key={creneau.id} style={{
                padding: '1rem',
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                textAlign: 'left',
                fontWeight: '600',
                minWidth: '200px'
              }}>
                <div>{creneau.label}</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  fontWeight: 'normal'
                }}>
                  {creneau.hours}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  fontWeight: 'normal'
                }}>
                  {creneau.medecins} médecin{creneau.medecins > 1 ? 's' : ''}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getFilteredDates().map(date => (
            <tr key={date} style={{
              backgroundColor: isWeekend(date) ? '#F9FAFB' : 'white'
            }}>
              <td style={{
                padding: '1rem',
                borderBottom: '1px solid #E5E7EB',
                fontWeight: '500',
                position: 'sticky',
                left: 0,
                backgroundColor: isWeekend(date) ? '#F9FAFB' : 'white',
                zIndex: 10
              }}>
                {formatDate(date)}
              </td>
              {getFilteredCreneaux().map(creneau => (
                <td key={`${date}-${creneau.id}`} style={{
                    padding: '1rem',
                    borderBottom: '1px solid #E5E7EB',
                    position: 'relative',
                    backgroundColor: selectedMedecin !== 'all' ? 
                      (() => {
                        const preference = getMedecinPreference(
                          desiderata,
                          selectedMedecin,
                          date,
                          creneau.id
                        );
                        return preference ? getPreferenceStyle(preference).backgroundColor : 'transparent';
                      })() : 'transparent'
                  }}>
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
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
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
                                <div style={{
                                  padding: '0.5rem',
                                  backgroundColor: '#F3F4F6',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}>
                                  {planning.planning[date]?.[creneau.id]?.[index] ? (
                                    (() => {
                                      const medecinId = planning.planning[date][creneau.id][index];
                                      const medecin = medecins.find(m => m.id === medecinId);
                                      const preference = getMedecinPreference(
                                        desiderata,
                                        medecinId,
                                        date,
                                        creneau.id
                                      );
                                      const style = getPreferenceStyle(preference);
                                      const isSelected = medecinId === selectedMedecin;
                                      
                                      return (
                                        <span style={{
                                          ...style,
                                          fontWeight: isSelected ? 'bold' : 'normal'
                                        }}>
                                          Dr. {medecin ? 
                                            `${medecin.prenom} ${medecin.nom}` : 
                                            'Médecin non trouvé'}
                                          {isSelected ? ' ★' : ''}
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    'Non assigné'
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanningTable;