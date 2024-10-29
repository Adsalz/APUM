// src/components/planning/components/MedecinSearchSelect.js
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

const MedecinSearchSelect = ({ 
  medecins, 
  value, 
  onChange,
  placeholder = "Rechercher un médecin..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Ferme la liste déroulante lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les médecins selon le terme de recherche
  const filteredMedecins = medecins.filter(medecin => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      medecin.nom.toLowerCase().includes(searchTermLower) ||
      medecin.prenom.toLowerCase().includes(searchTermLower)
    );
  });

  // Récupérer le médecin sélectionné
  const selectedMedecin = medecins.find(m => m.id === value);

  return (
    <div 
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      {/* Input de recherche */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search 
          size={18}
          style={{
            position: 'absolute',
            left: '0.75rem',
            color: '#6B7280'
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.5rem 2.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #D1D5DB',
            fontSize: '0.875rem'
          }}
        />
        <div style={{
          position: 'absolute',
          right: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsOpen(true);
              }}
              style={{
                padding: '0.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#6B7280'
              }}
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              padding: '0.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#6B7280'
            }}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Liste déroulante */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.25rem)',
          left: 0,
          right: 0,
          maxHeight: '15rem',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          border: '1px solid #D1D5DB',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 30
        }}>
          <div style={{
            padding: '0.25rem'
          }}>
            {/* Option "Tous les médecins" */}
            <button
              onClick={() => {
                onChange('all');
                setIsOpen(false);
                setSearchTerm('');
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                border: 'none',
                borderRadius: '0.25rem',
                backgroundColor: value === 'all' ? '#EBF5FF' : 'transparent',
                color: value === 'all' ? '#2563EB' : '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: value === 'all' ? '600' : 'normal'
              }}
            >
              Tous les médecins
            </button>

            {/* Liste des médecins filtrés */}
            {filteredMedecins.map(medecin => (
              <button
                key={medecin.id}
                onClick={() => {
                  onChange(medecin.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: '0.25rem',
                  backgroundColor: value === medecin.id ? '#EBF5FF' : 'transparent',
                  color: value === medecin.id ? '#2563EB' : '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: value === medecin.id ? '600' : 'normal'
                }}
              >
                Dr. {medecin.prenom} {medecin.nom}
              </button>
            ))}

            {/* Message si aucun résultat */}
            {filteredMedecins.length === 0 && (
              <div style={{
                padding: '0.5rem 0.75rem',
                color: '#6B7280',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                Aucun médecin trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Affichage du médecin sélectionné sous l'input */}
      {value !== 'all' && selectedMedecin && !isOpen && (
        <div style={{
          marginTop: '0.25rem',
          fontSize: '0.75rem',
          color: '#2563EB',
          fontWeight: '500'
        }}>
          Médecin sélectionné : Dr. {selectedMedecin.prenom} {selectedMedecin.nom}
        </div>
      )}
    </div>
  );
};

export default MedecinSearchSelect;