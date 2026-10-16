// src/components/ui/MedecinCombobox.js
// Choix d'un médecin : on tape le début d'un nom (ou d'un prénom) et la liste
// se réduit au fil des lettres — accents et casse ignorés. Le champ reste une
// liste déroulante classique si on préfère cliquer : au focus, tout est là.
//
// Deux règles tenues ICI pour qu'elles valent partout dans l'application :
//  1. NOM DE FAMILLE en premier (c'est le discriminant d'usage), prénom ensuite ;
//  2. liste triée par ordre alphabétique — le composant trie lui-même, aucun
//     appelant n'a besoin d'y penser.
//
// Accepte deux formes d'entrée : des médecins { id, nom, prenom } ou des
// entrées d'annuaire { id, label } (écran de connexion, où le nom complet
// n'est volontairement pas publié).
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { sansAccents } from '../../utils/medecins';

// React 17 : pas de useId, un compteur module suffit pour des id uniques.
let comboboxIdCounter = 0;

const aNomPrenom = (m) => Boolean(m && (m.nom || m.prenom));
const nomDe = (m) => (m?.nom || '').toUpperCase();
const libelleDe = (m) => (aNomPrenom(m) ? `${nomDe(m)} ${m.prenom || ''}`.trim() : (m?.label || ''));

const MedecinCombobox = React.forwardRef(function MedecinCombobox({
  medecins = [],
  value = '',
  onChange,
  placeholder = 'Taper un nom ou choisir dans la liste…',
  ariaLabel = 'Choisir un médecin',
  disabled = false,
  id,
  // Option « toutes les valeurs » facultative, toujours en tête de liste
  // (filtre du planning) : { value: 'all', label: 'Tous les médecins' }.
  optionTous = null,
  emptyLabel = 'Aucun médecin trouvé'
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listboxIdRef = useRef(null);
  if (listboxIdRef.current === null) {
    comboboxIdCounter += 1;
    listboxIdRef.current = `medecin-combobox-${comboboxIdCounter}`;
  }
  const listboxId = listboxIdRef.current;

  // La ref exposée pointe sur l'input (focus programmatique côté appelant).
  React.useImperativeHandle(ref, () => inputRef.current);

  const valeurVide = optionTous ? optionTous.value : '';

  // Tri alphabétique : nom puis prénom (accents et casse ignorés), ou label
  // pour les entrées d'annuaire.
  const medecinsTries = useMemo(() => {
    const cmp = (a, b) => (a || '').localeCompare(b || '', 'fr', { sensitivity: 'base' });
    return [...(medecins || [])].sort((a, b) =>
      (aNomPrenom(a) || aNomPrenom(b)
        ? cmp(a.nom, b.nom) || cmp(a.prenom, b.prenom)
        : cmp(a.label, b.label))
    );
  }, [medecins]);

  const selectedMedecin = medecinsTries.find((m) => m.id === value) || null;

  const resultats = useMemo(() => {
    const recherche = sansAccents(query).trim();
    if (!recherche) { return medecinsTries; }
    // Chaque mot tapé doit se retrouver dans le nom ou le prénom : « du an »
    // trouve « DURAND Anne » quel que soit l'ordre de frappe.
    const mots = recherche.split(/\s+/);
    return medecinsTries.filter((m) => {
      const cible = aNomPrenom(m)
        ? `${sansAccents(m.nom)} ${sansAccents(m.prenom)}`
        : sansAccents(m.label);
      return mots.every((mot) => cible.includes(mot));
    });
  }, [medecinsTries, query]);

  // Ferme au clic à l'extérieur, en abandonnant la frappe en cours.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Garde l'option survolée au clavier dans la partie visible de la liste.
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) { return; }
    const option = listRef.current.querySelector(`#${CSS.escape(listboxId)}-option-${activeIndex}`);
    if (option) { option.scrollIntoView({ block: 'nearest' }); }
  }, [isOpen, activeIndex, listboxId]);

  // Options navigables : « Tous les médecins » (si demandé) puis les résultats.
  const options = optionTous
    ? [optionTous.value, ...resultats.map((m) => m.id)]
    : resultats.map((m) => m.id);
  const decalage = optionTous ? 1 : 0;

  const ouvrir = () => {
    if (disabled) { return; }
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const fermer = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const commitSelection = (idChoisi) => {
    onChange(idChoisi);
    fermer();
  };

  const effacer = () => {
    onChange(valeurVide);
    setQuery('');
    setActiveIndex(-1);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) { ouvrir(); return; }
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) { ouvrir(); return; }
      setActiveIndex((i) => Math.max(i - 1, 0));
      break;
    case 'Enter':
      if (!isOpen) { return; }
      // Entrée sans avoir navigué : on prend le seul résultat restant.
      if (activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        commitSelection(options[activeIndex]);
      } else if (resultats.length === 1) {
        e.preventDefault();
        commitSelection(resultats[0].id);
      }
      break;
    case 'Escape':
    case 'Tab':
      fermer();
      break;
    default:
      break;
    }
  };

  // Fermé, le champ montre le choix en cours ; ouvert, il montre la frappe.
  const texteSelection = selectedMedecin
    ? libelleDe(selectedMedecin)
    : (optionTous && value === optionTous.value ? optionTous.label : '');
  const texteChamp = isOpen ? query : texteSelection;

  const optionClass = (active) =>
    `w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink-700 hover:bg-ink-50'
    }`;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-ink-400"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          disabled={disabled}
          value={texteChamp}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={ouvrir}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-16 text-sm text-ink-800 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {!disabled && (selectedMedecin || query) && (
            <button
              type="button"
              onClick={effacer}
              aria-label="Effacer"
              className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                fermer();
              } else {
                ouvrir();
                inputRef.current?.focus();
              }
            }}
            aria-label={isOpen ? 'Fermer la liste' : 'Ouvrir la liste'}
            className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Liste des médecins"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1 shadow-pop"
        >
          {optionTous && (
            <button
              type="button"
              id={`${listboxId}-option-0`}
              role="option"
              aria-selected={value === optionTous.value}
              onClick={() => commitSelection(optionTous.value)}
              onMouseEnter={() => setActiveIndex(0)}
              className={optionClass(value === optionTous.value || activeIndex === 0)}
            >
              {optionTous.label}
            </button>
          )}

          {resultats.map((medecin, idx) => {
            const optionIndex = idx + decalage;
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
                {aNomPrenom(medecin) ? (
                  <>
                    <span className="font-semibold">{nomDe(medecin)}</span>{' '}
                    <span className="text-ink-500">{medecin.prenom}</span>
                  </>
                ) : (
                  medecin.label
                )}
              </button>
            );
          })}

          {resultats.length === 0 && (
            <div className="px-3 py-2 text-center text-sm text-ink-500">
              {emptyLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default MedecinCombobox;
