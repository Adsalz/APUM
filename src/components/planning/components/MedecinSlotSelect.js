// src/components/planning/components/MedecinSlotSelect.js
// Sélecteur de médecin pour UNE place de garde (mode édition du planning).
// Remplace le <select> natif par un menu déroulant custom : chaque ligne est un
// vrai élément HTML (donc COLORABLE de façon fiable, contrairement aux <option>),
// montrant nom + choix du jour + jauge « attribuées ce mois / souhaitées » colorée
// selon le statut de quota. La case fermée affiche le médecin assigné, coloré pareil.
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  sortMedecinsByPreference,
  getMedecinPreference,
  getNombreGardesSouhaitees
} from '../../../utils/planningUtils';

// Compteur module pour un id de listbox unique par instance (React 17 : pas de useId)
let slotComboboxIdCounter = 0;

// Pastille de préférence (choix du jour)
const prefPillClass = (pref) => {
  switch (pref) {
  case 'Oui': return 'bg-success-50 text-success-700 ring-success-200';
  case 'Possible': return 'bg-warning-50 text-warning-700 ring-warning-200';
  case 'Non': return 'bg-danger-50 text-danger-700 ring-danger-200';
  default: return 'bg-ink-50 text-ink-500 ring-ink-200';
  }
};

// Statut de quota mensuel -> couleurs de la jauge
const statutQuota = (attribuees, souhait) => {
  if (!souhait) { return 'inconnu'; }
  if (attribuees > souhait) { return 'depasse'; }
  if (attribuees === souhait) { return 'plein'; }
  return 'ok';
};
const jaugeColors = {
  ok: { text: 'text-success-700', bar: 'bg-success-500', track: 'bg-success-100', border: 'border-success-300' },
  plein: { text: 'text-warning-700', bar: 'bg-warning-500', track: 'bg-warning-100', border: 'border-warning-300' },
  depasse: { text: 'text-danger-700', bar: 'bg-danger-500', track: 'bg-danger-100', border: 'border-danger-300' },
  inconnu: { text: 'text-ink-500', bar: 'bg-ink-300', track: 'bg-ink-100', border: 'border-ink-200' }
};

const MedecinSlotSelect = ({
  date,
  creneauId,
  index,
  currentValue,
  medecins,
  desiderata,
  selectedMedecin,
  onChange,
  dateLabel,
  creneauLabel,
  gardesMois // { medecinId: nombre } pour le mois de `date`
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listboxIdRef = useRef(null);
  if (listboxIdRef.current === null) {
    slotComboboxIdCounter += 1;
    listboxIdRef.current = `medecin-slot-listbox-${slotComboboxIdCounter}`;
  }
  const listboxId = listboxIdRef.current;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Médecins triés par préférence (Oui > Possible > non spécifié > Non), filtrés par recherche
  const sorted = sortMedecinsByPreference(medecins, desiderata, date, creneauId).all;
  const filtered = sorted.filter((m) => {
    const t = searchTerm.toLowerCase();
    return m.nom.toLowerCase().includes(t) || m.prenom.toLowerCase().includes(t);
  });

  // Options navigables : « Non assigné » (id '') puis les médecins filtrés
  const options = [{ id: '', medecin: null }, ...filtered.map((m) => ({ id: m.id, medecin: m }))];

  const infosJauge = (medecinId) => {
    const attribuees = gardesMois?.[medecinId] || 0;
    const souhait = getNombreGardesSouhaitees(desiderata, medecinId);
    return { attribuees, souhait, statut: statutQuota(attribuees, souhait) };
  };

  const commit = (id) => {
    onChange(date, creneauId, index, id);
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.max(i - 1, 0));
      break;
    case 'Enter':
      if (isOpen && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        commit(options[activeIndex].id);
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

  const selected = currentValue ? medecins.find((m) => m.id === currentValue) : null;
  const selInfo = currentValue ? infosJauge(currentValue) : null;
  const selColors = selInfo ? jaugeColors[selInfo.statut] : null;

  // Une ligne médecin dans la liste : nom + pastille choix + jauge colorée + mini-barre
  const renderLigne = (medecin, optionIndex) => {
    const pref = getMedecinPreference(desiderata, medecin.id, date, creneauId);
    const { attribuees, souhait, statut } = infosJauge(medecin.id);
    const colors = jaugeColors[statut];
    const pct = souhait ? Math.min(100, Math.round((attribuees / souhait) * 100)) : 0;
    const isSel = medecin.id === selectedMedecin;
    const active = activeIndex === optionIndex;
    return (
      <button
        key={medecin.id}
        type="button"
        id={`${listboxId}-option-${optionIndex}`}
        role="option"
        aria-selected={currentValue === medecin.id}
        onClick={() => commit(medecin.id)}
        onMouseEnter={() => setActiveIndex(optionIndex)}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
          active ? 'bg-ink-100' : 'hover:bg-ink-50'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${isSel ? 'font-bold text-primary-700' : 'text-ink-800'}`}>
          Dr. {medecin.prenom} {medecin.nom}{isSel ? ' ★' : ''}
        </span>
        {pref && (
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset ${prefPillClass(pref)}`}>
            {pref}
          </span>
        )}
        <span className={`shrink-0 tabular-nums text-xs font-bold ${colors.text}`}>
          {souhait ? `${attribuees}/${souhait}` : attribuees}{statut === 'depasse' ? ' ⚠' : ''}
        </span>
        {souhait ? (
          <span className={`h-1.5 w-9 shrink-0 overflow-hidden rounded-full ${colors.track}`} aria-hidden="true">
            <span className={`block h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
          </span>
        ) : (
          <span className="w-9 shrink-0" aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Case fermée : médecin assigné + sa jauge, colorée selon le quota */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Médecin — ${dateLabel} ${creneauLabel} place ${index + 1}`}
        className={`flex w-full items-center gap-2 rounded-lg border bg-white py-2 pl-3 pr-2 text-sm shadow-sm transition-colors hover:border-ink-300 focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
          selColors ? selColors.border : 'border-ink-200'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate text-left font-medium ${selColors ? selColors.text : 'text-ink-500'}`}>
          {selected ? `Dr. ${selected.prenom} ${selected.nom}` : 'Non assigné'}
          {selInfo ? (selInfo.souhait ? ` · ${selInfo.attribuees}/${selInfo.souhait}${selInfo.statut === 'depasse' ? ' ⚠' : ''}` : ` · ${selInfo.attribuees}`) : ''}
        </span>
        {isOpen ? <ChevronUp size={16} aria-hidden="true" className="shrink-0 text-ink-400" /> : <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-400" />}
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 rounded-xl border border-ink-200 bg-white p-1 shadow-pop">
          {/* Recherche */}
          <div className="relative flex items-center p-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 text-ink-400" />
            <input
              type="text"
              autoFocus
              aria-label="Rechercher un médecin"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-9 pr-8 text-sm text-ink-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setActiveIndex(-1); }}
                aria-label="Effacer la recherche"
                className="absolute right-3 rounded-md p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div id={listboxId} role="listbox" aria-label="Liste des médecins" className="max-h-64 overflow-y-auto p-1">
            {/* Non assigné */}
            <button
              type="button"
              id={`${listboxId}-option-0`}
              role="option"
              aria-selected={!currentValue}
              onClick={() => commit('')}
              onMouseEnter={() => setActiveIndex(0)}
              className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-500 transition-colors ${
                activeIndex === 0 ? 'bg-ink-100' : 'hover:bg-ink-50'
              }`}
            >
              Non assigné
            </button>

            {filtered.map((medecin, idx) => renderLigne(medecin, idx + 1))}

            {filtered.length === 0 && (
              <div className="px-3 py-2 text-center text-sm text-ink-500">Aucun médecin trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedecinSlotSelect;
