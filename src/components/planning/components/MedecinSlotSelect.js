// src/components/planning/components/MedecinSlotSelect.js
// Sélecteur de médecin pour UNE place de garde (mode édition du planning).
//
// Trois principes de lisibilité, tirés de l'audit de l'écran d'édition :
//  1. Le NOM DE FAMILLE d'abord et jamais tronqué — c'est le seul discriminant ;
//     « Dr. » est supprimé (redondant sur 100 % des lignes, il mangeait la place).
//  2. La couleur signale l'EXCEPTION, pas l'état nominal. Dans la grille (case
//     fermée) : neutre par défaut, rouge seulement en cas de problème. Dans le
//     menu ouvert (moment de la décision) : jauge de quota et problèmes détaillés.
//  3. Le menu est rendu dans un PORTAIL en position fixe : le conteneur de la
//     table (`overflow-x-auto`) clippait le menu sur la dernière colonne et les
//     dernières lignes, et son ouverture faisait défiler la table.
//
// Le composant est mémoïsé et ne calcule la liste des candidats QU'À L'OUVERTURE :
// le mode édition monte plus de 1 000 instances simultanées.
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, ChevronUp, Plus, AlertTriangle } from 'lucide-react';
import {
  preferencePour,
  souhaitMensuelDe,
  gardesDuMois,
  problemesCandidat,
  pireNiveau,
  NIVEAUX
} from '../../../utils/planningEdition';

const LARGEUR_MENU = 336; // px — assez pour « SANTONI-BRIAND Béatrice » en entier
const HAUTEUR_MENU_MAX = 384;

const prefPillClass = (pref) => {
  switch (pref) {
  case 'Oui': return 'bg-success-50 text-success-700 ring-success-200';
  case 'Possible': return 'bg-warning-50 text-warning-700 ring-warning-200';
  case 'Non': return 'bg-danger-50 text-danger-700 ring-danger-200';
  default: return 'bg-ink-100 text-ink-500 ring-ink-200';
  }
};

// Rang de préférence : c'est la clé de tri PRINCIPALE — le premier critère de
// choix reste « ce médecin s'est-il proposé pour ce créneau ? ».
const rangPreference = (pref) => ({ Oui: 0, Possible: 1, Non: 3 }[pref] ?? 2);

// Groupes du menu, du plus au moins recommandable.
// NB : « quota mensuel atteint » ne déclasse PAS. Les places restent vides
// justement parce que le générateur ne dépasse jamais le quota déclaré : si le
// dépassement rétrogradait, l'écran enterrerait précisément les médecins que
// l'admin doit solliciter. Le quota reste affiché (jauge) et départage à
// préférence égale — celui qui a le plus de marge d'abord.
const GROUPES = [
  { cle: 'disponibles', titre: null },
  { cle: 'horsDesiderata', titre: 'Hors desiderata' },
  { cle: 'contrainte', titre: 'Contrainte non respectée' }
];
const rangGroupe = (candidat) => {
  if (candidat.niveau === NIVEAUX.DUR) { return 2; }
  return (candidat.pref === 'Oui' || candidat.pref === 'Possible') ? 0 : 1;
};

// Toutes les props sont des PRIMITIVES, sauf `ctx` qui est une ref stable vers les
// données lourdes (index, planning). C'est ce qui rend `React.memo` efficace : les
// index changent d'identité à chaque affectation, si bien qu'en les passant
// directement les ~1 158 sélecteurs se seraient tous re-rendus à chaque clic.
// Le menu ouvert lit `ctx.current` au moment où il s'ouvre — donc toujours à jour.
const MedecinSlotSelect = ({
  date,
  creneauId,
  index,
  currentValue,
  nom,              // nom de famille du médecin affecté ('' si place vide)
  prenom,
  souhait,          // quota mensuel déclaré (0 = non renseigné)
  attribuees,       // gardes déjà attribuées ce mois-ci
  niveauProbleme,   // gravité de l'affectation EN PLACE ('' | 'fort' | 'dur')
  onChange,
  dateLabel,
  creneauLabel,
  ctx
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listeRef = useRef(null);
  const listboxIdRef = useRef(null);
  if (listboxIdRef.current === null) {
    listboxIdRef.current = `slot-listbox-${date}-${creneauId}-${index}`;
  }
  const listboxId = listboxIdRef.current;

  // --- Positionnement du menu (portail, position fixe, retournement auto) ---
  const positionner = useCallback(() => {
    const el = triggerRef.current;
    if (!el) { return; }
    const r = el.getBoundingClientRect();
    const placeEnBas = window.innerHeight - r.bottom - 12;
    const placeEnHaut = r.top - 12;
    const versLeHaut = placeEnBas < 240 && placeEnHaut > placeEnBas;
    setCoords({
      left: Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - LARGEUR_MENU - 8)),
      top: versLeHaut ? null : r.bottom + 4,
      bottom: versLeHaut ? window.innerHeight - r.top + 4 : null,
      hauteurMax: Math.max(180, Math.min(HAUTEUR_MENU_MAX, versLeHaut ? placeEnHaut : placeEnBas))
    });
  }, []);

  useEffect(() => {
    if (!isOpen) { return undefined; }
    positionner();
    const surClicExterieur = (e) => {
      if (triggerRef.current?.contains(e.target)) { return; }
      if (menuRef.current?.contains(e.target)) { return; }
      setIsOpen(false);
    };
    // `true` : on suit aussi le défilement du conteneur de la table.
    window.addEventListener('scroll', positionner, true);
    window.addEventListener('resize', positionner);
    document.addEventListener('mousedown', surClicExterieur);
    return () => {
      window.removeEventListener('scroll', positionner, true);
      window.removeEventListener('resize', positionner);
      document.removeEventListener('mousedown', surClicExterieur);
    };
  }, [isOpen, positionner]);

  // --- Candidats : calculés UNIQUEMENT quand le menu est ouvert ---
  const { medecins, idxDesiderata, idxPlanning, planningJours, selectedMedecin } = ctx.current;
  const candidats = useMemo(() => {
    if (!isOpen) { return []; }
    const terme = searchTerm.trim().toLowerCase();
    return medecins
      .filter((m) => !terme
        || m.nom.toLowerCase().includes(terme)
        || m.prenom.toLowerCase().includes(terme))
      .map((m) => {
        const problemes = problemesCandidat(
          m.id, date, creneauId, planningJours, idxPlanning, idxDesiderata
        );
        const bloquants = problemes.filter((p) => p.niveau !== NIVEAUX.INFO);
        const pref = preferencePour(idxDesiderata, m.id, date, creneauId);
        const souhait = souhaitMensuelDe(idxDesiderata, m.id);
        const attribuees = gardesDuMois(idxPlanning, date, m.id);
        const candidat = {
          medecin: m,
          pref,
          souhait,
          attribuees,
          problemes: bloquants,
          niveau: pireNiveau(bloquants),
          marge: souhait ? souhait - attribuees : 99
        };
        return { ...candidat, groupe: rangGroupe(candidat) };
      })
      // 1. groupe (disponibles / hors desiderata / contrainte dure)
      // 2. PRÉFÉRENCE du jour — « Oui » avant « Possible »
      // 3. marge de quota restante, la plus grande d'abord
      .sort((a, b) =>
        (a.groupe - b.groupe)
        || (rangPreference(a.pref) - rangPreference(b.pref))
        || (b.marge - a.marge)
        || a.medecin.nom.localeCompare(b.medecin.nom, 'fr'));
  }, [isOpen, searchTerm, medecins, date, creneauId, planningJours, idxPlanning, idxDesiderata]);

  // Index 0 = « Retirer / Non assigné », les candidats suivent.
  const nbOptions = candidats.length + 1;

  const fermer = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(0);
    triggerRef.current?.focus();
  }, []);

  const commit = useCallback((id) => {
    onChange(date, creneauId, index, id);
    fermer();
  }, [onChange, date, creneauId, index, fermer]);

  // Garde l'option active visible dans la liste.
  useEffect(() => {
    if (!isOpen) { return; }
    const el = listeRef.current?.querySelector(`#${CSS.escape(listboxId)}-option-${activeIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listboxId]);

  const handleKeyDown = (e) => {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, nbOptions - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.max(i - 1, 0));
      break;
    case 'Home':
      if (isOpen) { e.preventDefault(); setActiveIndex(0); }
      break;
    case 'End':
      if (isOpen) { e.preventDefault(); setActiveIndex(nbOptions - 1); }
      break;
    case 'Enter':
      if (isOpen) {
        e.preventDefault();
        commit(activeIndex === 0 ? '' : candidats[activeIndex - 1].medecin.id);
      } else {
        e.preventDefault();
        setIsOpen(true);
      }
      break;
    case 'Escape':
      if (isOpen) { e.preventDefault(); fermer(); }
      break;
    default:
      break;
    }
  };

  const enAlerte = niveauProbleme === NIVEAUX.DUR || niveauProbleme === NIVEAUX.FORT;
  // La cellule fait ~190 px : le nom de famille doit y tenir ENTIER. Le prénom est
  // donc réduit à son initiale (et tronqué en premier si la place manque), et le
  // compteur de quota sort de la case — il reste dans le menu et dans l'infobulle.
  // Un dépassement est signalé par ⚠, pas par un ratio coloré répété partout.
  const initiale = prenom ? `${prenom.charAt(0).toUpperCase()}.` : '';

  // Case fermée : neutre par défaut, colorée UNIQUEMENT si quelque chose cloche.
  const classeCase = [
    'flex w-full items-center gap-1.5 rounded-lg border py-1.5 pl-2.5 pr-1.5 text-left text-sm shadow-sm',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30',
    currentValue
      ? (niveauProbleme === NIVEAUX.DUR
        ? 'border-danger-300 bg-danger-50/60 hover:border-danger-400'
        : niveauProbleme === NIVEAUX.FORT
          ? 'border-warning-300 bg-warning-50/50 hover:border-warning-400'
          : 'border-ink-200 bg-white hover:border-ink-300')
      // Place vide : c'est CE que l'admin cherche → traitement visible et actionnable.
      : 'border-dashed border-warning-400 bg-warning-50/40 hover:border-warning-500 hover:bg-warning-50'
  ].join(' ');

  const ligneCandidat = (c, optionIndex) => {
    const actif = activeIndex === optionIndex;
    const estFiltre = c.medecin.id === selectedMedecin;
    const complet = Boolean(c.souhait) && c.attribuees >= c.souhait;
    const depasse = Boolean(c.souhait) && c.attribuees > c.souhait;
    const pct = c.souhait ? Math.min(100, Math.round((c.attribuees / c.souhait) * 100)) : 0;
    return (
      <button
        key={c.medecin.id}
        type="button"
        id={`${listboxId}-option-${optionIndex}`}
        role="option"
        aria-selected={currentValue === c.medecin.id}
        onClick={() => commit(c.medecin.id)}
        onMouseEnter={() => setActiveIndex(optionIndex)}
        className={`flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors ${
          actif ? 'bg-primary-50' : 'hover:bg-ink-50'
        }`}
      >
        <span className="flex w-full items-baseline gap-2">
          <span className={`min-w-0 flex-1 text-sm leading-tight ${
            estFiltre ? 'font-bold text-primary-700' : 'font-semibold text-ink-900'
          }`}>
            {c.medecin.nom}{' '}
            <span className="font-normal text-ink-500">{c.medecin.prenom}</span>
            {estFiltre ? ' ★' : ''}
          </span>
          {c.pref && (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset ${prefPillClass(c.pref)}`}>
              {c.pref}
            </span>
          )}
        </span>

        <span className="flex w-full items-center gap-2">
          <span className={`shrink-0 tabular-nums text-xs font-semibold ${
            depasse ? 'text-danger-600' : complet ? 'text-ink-500' : 'text-success-700'
          }`}>
            {c.souhait ? `${c.attribuees}/${c.souhait}` : `${c.attribuees} garde${c.attribuees > 1 ? 's' : ''}`}
          </span>
          {c.souhait ? (
            <span className={`h-1 flex-1 overflow-hidden rounded-full ${depasse ? 'bg-danger-100' : 'bg-ink-100'}`} aria-hidden="true">
              <span
                className={`block h-full rounded-full ${depasse ? 'bg-danger-500' : complet ? 'bg-ink-400' : 'bg-success-500'}`}
                style={{ width: `${pct}%` }}
              />
            </span>
          ) : (
            <span className="flex-1 text-[0.65rem] text-ink-400">quota non renseigné</span>
          )}
        </span>

        {c.problemes.length > 0 && (
          <span className={`flex items-start gap-1 text-[0.7rem] leading-tight ${
            c.niveau === NIVEAUX.DUR ? 'text-danger-700' : 'text-warning-700'
          }`}>
            <AlertTriangle size={12} aria-hidden="true" className="mt-px shrink-0" />
            <span>{c.problemes.map((p) => p.detail ? `${p.libelle} (${p.detail})` : p.libelle).join(' · ')}</span>
          </span>
        )}
      </button>
    );
  };

  const menu = coords && (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top ?? undefined,
        bottom: coords.bottom ?? undefined,
        width: LARGEUR_MENU,
        zIndex: 60
      }}
      className="rounded-xl border border-ink-200 bg-white p-1 shadow-pop"
    >
      <div className="px-1 pb-1 pt-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">
        {dateLabel} · {creneauLabel} · place {index + 1}
      </div>

      <div className="relative flex items-center p-1">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 text-ink-400" />
        <input
          type="text"
          autoFocus
          role="combobox"
          aria-label="Rechercher un médecin"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={`${listboxId}-option-${activeIndex}`}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un médecin…"
          className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-9 pr-8 text-sm text-ink-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setActiveIndex(0); }}
            aria-label="Effacer la recherche"
            className="absolute right-3 rounded-md p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        id={listboxId}
        ref={listeRef}
        role="listbox"
        aria-label="Médecins disponibles pour cette place"
        className="overflow-y-auto p-1"
        style={{ maxHeight: coords.hauteurMax }}
      >
        <button
          type="button"
          id={`${listboxId}-option-0`}
          role="option"
          aria-selected={!currentValue}
          onClick={() => commit('')}
          onMouseEnter={() => setActiveIndex(0)}
          className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-ink-500 transition-colors ${
            activeIndex === 0 ? 'bg-primary-50' : 'hover:bg-ink-50'
          }`}
        >
          {currentValue ? 'Retirer ce médecin' : 'Laisser vide'}
        </button>

        {candidats.map((c, i) => {
          // Intertitre au changement de groupe (jamais avant le premier).
          const titre = (i > 0 && c.groupe !== candidats[i - 1].groupe)
            ? GROUPES[c.groupe]?.titre
            : null;
          return (
            <React.Fragment key={c.medecin.id}>
              {titre && (
                <div className="mb-1 mt-2 border-t border-ink-100 px-2.5 pt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">
                  {titre}
                </div>
              )}
              {ligneCandidat(c, i + 1)}
            </React.Fragment>
          );
        })}

        {candidats.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-ink-500">Aucun médecin trouvé</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-slot-picker={`${date}|${creneauId}|${index}`}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          `${dateLabel} ${creneauLabel} place ${index + 1} — ` +
          (currentValue ? `${nom} ${prenom}`.trim() : 'place non pourvue') +
          (enAlerte ? ' — affectation à vérifier' : '')
        }
        title={currentValue
          ? `${nom} ${prenom}`.trim() + (souhait ? ` — ${attribuees}/${souhait} gardes ce mois` : '')
          : 'Place non pourvue — cliquer pour affecter un médecin'}
        className={classeCase}
      >
        {currentValue ? (
          <span className="min-w-0 flex-1 truncate text-left font-semibold text-ink-900">
            {nom}
            {initiale && <span className="font-normal text-ink-500"> {initiale}</span>}
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1 text-left font-medium text-warning-800">
            <Plus size={14} aria-hidden="true" className="shrink-0" />
            Non pourvu
          </span>
        )}

        {enAlerte && (
          <AlertTriangle
            size={14}
            aria-hidden="true"
            className={`shrink-0 ${niveauProbleme === NIVEAUX.DUR ? 'text-danger-600' : 'text-warning-600'}`}
          />
        )}
        {isOpen
          ? <ChevronUp size={14} aria-hidden="true" className="shrink-0 text-ink-400" />
          : <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-ink-400" />}
      </button>

      {isOpen && createPortal(menu, document.body)}
    </>
  );
};

export default React.memo(MedecinSlotSelect);
