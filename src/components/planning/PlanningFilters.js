// src/components/planning/PlanningFilters.js
import React from 'react';
import { Filter, ChevronDown, ChevronUp, Search, List, Grid } from 'lucide-react';
import MedecinSearchSelect from './components/MedecinSearchSelect';

const PlanningFilters = ({
  showFilters,
  onToggleFilters,
  dateFilter,
  onDateFilterChange,
  creneauFilter,
  onCreneauFilterChange,
  selectedMedecin,
  onMedecinFilterChange,
  viewMode,
  onViewModeChange,
  medecins,
  creneaux
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={onToggleFilters}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          borderRadius: '0.5rem'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#374151'
        }}>
          <Filter size={20} />
          <span style={{ fontWeight: '500' }}>Filtres et recherche</span>
        </div>
        {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {showFilters && (
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #E5E7EB'
        }}>
          <div style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            {/* Filtre par période */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Période
              </label>
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => onDateFilterChange({ ...dateFilter, start: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => onDateFilterChange({ ...dateFilter, end: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* Filtre par créneau */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Créneau
              </label>
              <select
                value={creneauFilter}
                onChange={(e) => onCreneauFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">Tous les créneaux</option>
                {creneaux.map(creneau => (
                  <option key={creneau.id} value={creneau.id}>
                    {creneau.label} ({creneau.hours})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par médecin */}
            <div>
  <label style={{
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem'
  }}>
    Médecin
  </label>
  <MedecinSearchSelect
    medecins={medecins}
    value={selectedMedecin}
    onChange={onMedecinFilterChange}
    placeholder="Rechercher un médecin..."
  />
</div>

            {/* Sélecteur de vue */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Mode d'affichage
              </label>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                backgroundColor: '#F3F4F6',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                width: 'fit-content'
              }}>
                <button
                  onClick={() => onViewModeChange('list')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <List size={20} color={viewMode === 'list' ? '#2563EB' : '#6B7280'} />
                </button>
                <button
                  onClick={() => onViewModeChange('grid')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Grid size={20} color={viewMode === 'grid' ? '#2563EB' : '#6B7280'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningFilters;