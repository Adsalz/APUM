// src/components/planning/components/MedecinSearchSelect.js
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

// Compteur module pour générer un id de listbox unique par instance (React 17 : pas de useId)
let comboboxIdCounter = 0;

const MedecinSearchSelect = ({
  medecins,
  value,
  onChange,
  placeholder = 'Rechercher un médecin...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listboxIdRef = useRef(null);
  if (listboxIdRef.current === null) {
    comboboxIdCounter += 1;
    listboxIdRef.current = `medecin-search-listbox-${comboboxIdCounter}`;
  }
  const listboxId = listboxIdRef.current;

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

  // Options navigables au clavier : « Tous les médecins » puis les médecins filtrés
  const options = [
    { id: 'all', label: 'Tous les médecins' },
    ...filteredMedecins.map(m => ({ id: m.id, label: `Dr. ${m.prenom} ${m.nom}` }))
  ];

  const commitSelection = (id) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex(i => Math.min(i + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex(i => Math.max(i - 1, 0));
      break;
    case 'Enter':
      if (isOpen && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        commitSelection(options[activeIndex].id);
      }
      break;
    case 'Escape':
      setIsOpen(false);
      setActiveIndex(-1);
      break;
    default:
      break;
    }
  };

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
          role="combobox"
          aria-label="Rechercher un médecin"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-16 text-sm text-ink-800 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveIndex(-1);
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
        <div
          id={listboxId}
          role="listbox"
          aria-label="Liste des médecins"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-60 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1 shadow-pop"
        >
          {/* Option "Tous les médecins" */}
          <button
            type="button"
            id={`${listboxId}-option-0`}
            role="option"
            aria-selected={value === 'all'}
            onClick={() => commitSelection('all')}
            onMouseEnter={() => setActiveIndex(0)}
            className={optionClass(value === 'all' || activeIndex === 0)}
          >
            Tous les médecins
          </button>

          {/* Liste des médecins filtrés */}
          {filteredMedecins.map((medecin, idx) => {
            const optionIndex = idx + 1;
            return (
              <button
                key={medecin.id}
                type="button"
                id={`${listboxId}-option-${optionIndex}`}
                role="option"
                aria-selected={value === medecin.id}
                onClick={() => commitSelection(medecin.id)}
                onMouseEnter={() => setActiveIndex(optionIndex)}
                className={optionClass(value === medecin.id || activeIndex === optionIndex)}
              >
                Dr. {medecin.prenom} {medecin.nom}
              </button>
            );
          })}

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
