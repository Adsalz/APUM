// src/components/QuickFill.js
import React, { useState } from 'react';
import { Upload, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

function QuickFill({ creneaux, onApply, periodeSaisie }) {
  const [selectedCreneaux, setSelectedCreneaux] = useState({});
  const [selectedJours, setSelectedJours] = useState({});
  const [selectedDispo, setSelectedDispo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const jours = [
    { id: '1', label: 'Lundi' },
    { id: '2', label: 'Mardi' },
    { id: '3', label: 'Mercredi' },
    { id: '4', label: 'Jeudi' },
    { id: '5', label: 'Vendredi' },
    { id: '6', label: 'Samedi' },
    { id: '0', label: 'Dimanche' }
  ];

  const handleSelectFullPeriod = () => {
    if (periodeSaisie) {
      setStartDate(periodeSaisie.startDate.split('T')[0]);
      setEndDate(periodeSaisie.endDate.split('T')[0]);
    }
  };

  const toggleAllCreneaux = () => {
    const allSelected = creneaux.every(creneau => selectedCreneaux[creneau.id]);
    const newSelectedCreneaux = {};
    creneaux.forEach(creneau => {
      newSelectedCreneaux[creneau.id] = !allSelected;
    });
    setSelectedCreneaux(newSelectedCreneaux);
  };

  const toggleAllJours = () => {
    const allSelected = jours.every(jour => selectedJours[jour.id]);
    const newSelectedJours = {};
    jours.forEach(jour => {
      newSelectedJours[jour.id] = !allSelected;
    });
    setSelectedJours(newSelectedJours);
  };

  const handleApply = () => {
    if (!selectedDispo) {
      alert('Veuillez sélectionner une disponibilité');
      return;
    }
  
    if (!startDate || !endDate) {
      alert('Veuillez sélectionner une période');
      return;
    }
  
    const selectedCreneauxArray = Object.entries(selectedCreneaux)
      .filter(([_, isSelected]) => isSelected)
      .map(([creneauId]) => creneauId);
  
    const selectedJoursArray = Object.entries(selectedJours)
      .filter(([_, isSelected]) => isSelected)
      .map(([jourId]) => {
        // Converti correctement les IDs de jours
        return jourId;
      });
  
    if (selectedCreneauxArray.length === 0) {
      alert('Veuillez sélectionner au moins un créneau');
      return;
    }
  
    if (selectedJoursArray.length === 0) {
      alert('Veuillez sélectionner au moins un jour');
      return;
    }
  
    onApply({
      creneaux: selectedCreneauxArray,
      jours: selectedJoursArray,
      disponibilite: selectedDispo,
      startDate: startDate,
      endDate: endDate
    });
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      width: '100%'
    }}>
      {/* En-tête avec bouton pour replier/déplier */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
          transition: 'background-color 0.2s',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1F2937',
            margin: 0
          }}>
            Remplissage rapide
          </h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: '#6B7280',
          fontSize: '0.875rem',
          gap: '0.5rem'
        }}>
          {isExpanded ? 'Replier' : 'Déplier'}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Sélection de la période */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Période de remplissage
              </label>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ minWidth: '140px', flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: '#6B7280',
                      marginBottom: '0.25rem'
                    }}>
                      Du :
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        width: '100%'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: '140px', flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: '#6B7280',
                      marginBottom: '0.25rem'
                    }}>
                      Au :
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        width: '100%'
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSelectFullPeriod}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#EBF5FF',
                    border: '1px solid #2563EB',
                    borderRadius: '0.375rem',
                    color: '#2563EB',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#EBF5FF'}
                >
                  <Calendar size={16} />
                  Toute la période
                </button>
              </div>
            </div>

            {/* Sélection des créneaux */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Créneaux
                </label>
                <button
                  onClick={toggleAllCreneaux}
                  style={{
                    fontSize: '0.75rem',
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  {creneaux.every(creneau => selectedCreneaux[creneau.id]) 
                    ? 'Tout désélectionner' 
                    : 'Tout sélectionner'}
                </button>
              </div>
              <div style={{
                display: 'grid',
                gap: '0.5rem',
                border: '1px solid #E5E7EB',
                padding: '0.5rem',
                borderRadius: '0.375rem'
              }}>
                {creneaux.map(creneau => (
                  <label
                    key={creneau.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCreneaux[creneau.id] || false}
                      onChange={() => {
                        setSelectedCreneaux(prev => ({
                          ...prev,
                          [creneau.id]: !prev[creneau.id]
                        }));
                      }}
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '0.25rem'
                      }}
                    />
                    <div>
                      <div>{creneau.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {creneau.hours}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sélection des jours */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Jours de la semaine
                </label>
                <button
                  onClick={toggleAllJours}
                  style={{
                    fontSize: '0.75rem',
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  {jours.every(jour => selectedJours[jour.id]) 
                    ? 'Tout désélectionner' 
                    : 'Tout sélectionner'}
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.5rem',
                border: '1px solid #E5E7EB',
                padding: '0.5rem',
                borderRadius: '0.375rem'
              }}>
                {jours.map(jour => (
                  <label
                    key={jour.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedJours[jour.id] || false}
                      onChange={() => {
                        setSelectedJours(prev => ({
                          ...prev,
                          [jour.id]: !prev[jour.id]
                        }));
                      }}
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '0.25rem'
                      }}
                    />
                    <span>{jour.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sélection de la disponibilité */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Disponibilité
              </label>
              <select
                value={selectedDispo}
                onChange={(e) => setSelectedDispo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Sélectionnez une disponibilité</option>
                <option value="Oui">Oui</option>
                <option value="Possible">Possible</option>
                <option value="Non">Non</option>
              </select>
            </div>

            {/* Bouton d'application */}
            <button
              onClick={handleApply}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <Upload size={18} />
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickFill;