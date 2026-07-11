// src/components/planning/components/MedecinSearchSelect.js
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

const MedecinSearchSelect = ({
  medecins,
  value,
  onChange,
  placeholder = 'Rechercher un médecin...'
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

  const optionClass = (active) =>
    `w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active
        ? 'bg-primary-50 font-semibold text-primary-700'
        : 'text-ink-700 hover:bg-ink-50'
    }`;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input de recherche */}
      <div className="relative flex items-center">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-ink-400"
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
          className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-16 text-sm text-ink-800 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setIsOpen(true);
              }}
              aria-label="Effacer la recherche"
              className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Fermer la liste' : 'Ouvrir la liste'}
            className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Liste déroulante */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-60 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1 shadow-pop">
          {/* Option "Tous les médecins" */}
          <button
            type="button"
            onClick={() => {
              onChange('all');
              setIsOpen(false);
              setSearchTerm('');
            }}
            className={optionClass(value === 'all')}
          >
            Tous les médecins
          </button>

          {/* Liste des médecins filtrés */}
          {filteredMedecins.map(medecin => (
            <button
              key={medecin.id}
              type="button"
              onClick={() => {
                onChange(medecin.id);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={optionClass(value === medecin.id)}
            >
              Dr. {medecin.prenom} {medecin.nom}
            </button>
          ))}

          {/* Message si aucun résultat */}
          {filteredMedecins.length === 0 && (
            <div className="px-3 py-2 text-center text-sm text-ink-500">
              Aucun médecin trouvé
            </div>
          )}
        </div>
      )}

      {/* Affichage du médecin sélectionné sous l'input */}
      {value !== 'all' && selectedMedecin && !isOpen && (
        <div className="mt-1 text-xs font-medium text-primary-600">
          Médecin sélectionné : Dr. {selectedMedecin.prenom} {selectedMedecin.nom}
        </div>
      )}
    </div>
  );
};

export default MedecinSearchSelect;
